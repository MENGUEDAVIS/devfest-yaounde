/**
 * DP generator — the community wall.
 *
 * This is the ONE path by which a card may leave the device, and it exists
 * only because someone asked for it explicitly, in that session, for that
 * card. See docs/decisions/0021-dp-community-wall.md — it reverses, narrowly,
 * the no-upload rule in ADR 0015.
 *
 * The backend exists (ADR 0026). The wall is on unless the deployment sets
 * `NEXT_PUBLIC_DP_GALLERY=0` (ADR 0033). `galleryEnabled()` still gates the
 * control: a button that quietly fails is worse than no button.
 */

/**
 * Longest edge of the copy that gets uploaded.
 *
 * A wall thumbnail does not need 1080, let alone 2160. 640 keeps a card
 * legible at the size a grid actually shows it, and cuts what leaves the
 * device — and what has to be stored, served and moderated — by roughly
 * thirty times.
 */
export const GALLERY_MAX_EDGE = 640;

/** JPEG rather than PNG: a photograph on a wall, not an asset to re-edit. */
const GALLERY_TYPE = "image/jpeg";
const GALLERY_QUALITY = 0.82;

/** Where a deletion token is kept so someone can take their card down. */
export const GALLERY_TOKENS_KEY = "devfest-dp-gallery";

export type GalleryError =
  | "gallery_disabled"
  | "gallery_rate_limited"
  | "gallery_rejected"
  | "gallery_failed";

export class GallerySubmitError extends Error {
  constructor(readonly code: GalleryError) {
    super(code);
    this.name = "GallerySubmitError";
  }
}

/**
 * Is the wall live?
 *
 * Read from a build-time public flag rather than probed at runtime: probing
 * would mean a request on every page load to discover a feature that is off,
 * and a flag is what the deployment already knows.
 */
export function galleryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DP_GALLERY === "1";
}

/**
 * The lighter copy that gets uploaded.
 *
 * Re-encoding through a canvas has a property worth stating plainly: the
 * result carries NO EXIF. The original's GPS coordinates, camera serial and
 * capture time cannot reach the server, because they were never in the
 * pixels — the compositor drew from a bitmap, not from the file. That is a
 * consequence of how the card is made, not a filter someone has to remember
 * to apply.
 */
export async function galleryCopy(card: Blob): Promise<Blob> {
  const source = await createImageBitmap(card);
  const scale = Math.min(
    1,
    GALLERY_MAX_EDGE / Math.max(source.width, source.height),
  );
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);
    source.close();
    return canvas.convertToBlob({
      type: GALLERY_TYPE,
      quality: GALLERY_QUALITY,
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  source.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("no blob"))),
      GALLERY_TYPE,
      GALLERY_QUALITY,
    );
  });
}

export interface GallerySubmission {
  /** What was returned so this browser can take the card down again. */
  deletionToken: string;
  /**
   * What actually happened. `approved` means it is on the wall now;
   * `pending` means a reviewer has to see it first. Which one you get is a
   * deployment decision (ADR 0027), so the screen must read this rather than
   * assume.
   */
  status: "approved" | "pending";
}

/**
 * Hand one card to the wall.
 *
 * `consent` is not a formality and not a default: the request carries the
 * fact that a person ticked a box on this card, and the server is asked to
 * store that alongside the image. A wall of faces with no record of who
 * agreed to what is the thing this must never become.
 */
export async function submitToGallery(input: {
  card: Blob;
  nickname: string;
  locale: "fr" | "en";
}): Promise<GallerySubmission> {
  if (!galleryEnabled()) throw new GallerySubmitError("gallery_disabled");

  const body = new FormData();
  body.set("image", await galleryCopy(input.card), "card.jpg");
  body.set("nickname", input.nickname.trim().slice(0, 28));
  body.set("locale", input.locale);
  body.set("consent", "true");
  body.set("consentAt", new Date().toISOString());

  let response: Response;
  try {
    response = await fetch("/api/dp/gallery", { method: "POST", body });
  } catch {
    throw new GallerySubmitError("gallery_failed");
  }

  if (response.status === 429)
    throw new GallerySubmitError("gallery_rate_limited");
  if (response.status === 422) throw new GallerySubmitError("gallery_rejected");
  if (!response.ok) throw new GallerySubmitError("gallery_failed");

  const data = (await response.json().catch(() => null)) as {
    deletionToken?: string;
    status?: "approved" | "pending";
  } | null;
  if (!data?.deletionToken) throw new GallerySubmitError("gallery_failed");

  rememberToken(data.deletionToken);
  return {
    deletionToken: data.deletionToken,
    status: data.status === "pending" ? "pending" : "approved",
  };
}

/**
 * Keep the deletion token on the device.
 *
 * There is no account, so this token IS the proof of authorship — lose it and
 * the only route to a takedown is asking the team. Kept in `localStorage`
 * with the same honesty as the bag (GAPS.md G15): it does not follow anyone
 * to another device, and clearing site data loses it.
 */
/**
 * Flag a live card. No account, no reason form — the organisers look at the
 * picture. A second tap from the same browser is still a success.
 */
export async function reportGalleryCard(id: string): Promise<void> {
  if (!galleryEnabled()) throw new GallerySubmitError("gallery_disabled");

  let response: Response;
  try {
    response = await fetch(`/api/dp/gallery/${id}/report`, { method: "POST" });
  } catch {
    throw new GallerySubmitError("gallery_failed");
  }

  if (response.status === 429)
    throw new GallerySubmitError("gallery_rate_limited");
  if (!response.ok) throw new GallerySubmitError("gallery_failed");
}

function rememberToken(token: string) {
  try {
    const raw = window.localStorage.getItem(GALLERY_TOKENS_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    window.localStorage.setItem(
      GALLERY_TOKENS_KEY,
      JSON.stringify([...list.filter((t) => t !== token), token].slice(-20)),
    );
  } catch {
    // Private mode: the submission still stands, the takedown shortcut does not.
  }
}
