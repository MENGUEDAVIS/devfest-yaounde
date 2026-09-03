/**
 * The community wall, server side.
 *
 * Everything here exists because the wall publishes photographs of faces.
 * The rules are not stylistic:
 *
 *   - the bytes are validated by DECODING them, never by trusting a
 *     Content-Type header, which is a claim a browser makes;
 *   - they are re-encoded before anything is stored, so nothing a stranger
 *     supplied is ever served back;
 *   - cards publish on arrival unless DP_GALLERY_REVIEW=1 (ADR 0027);
 *   - the takedown token is stored as a hash, for the same reason a password
 *     is.
 *
 * Contract: docs/backend/dp-gallery-contract.md. Decision: ADR 0021.
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/server";

/** Private on purpose: reads go through a signed URL that we mint per read. */
export const GALLERY_BUCKET = "dp-cards";

/** The client already downscales to 640px; this is the ceiling we enforce. */
export const MAX_EDGE = 800;
export const MAX_BYTES = 400 * 1024;
const MAX_NICKNAME = 28;

/** How long a wall image URL stays valid. Long enough to render, not to hotlink. */
const SIGNED_URL_SECONDS = 600;

export type SubmitRejection =
  | "not_an_image"
  | "too_large"
  | "too_big_dimensions"
  | "bad_nickname"
  | "bad_locale"
  | "no_consent";

export class GalleryRejected extends Error {
  constructor(readonly reason: SubmitRejection) {
    super(reason);
    this.name = "GalleryRejected";
  }
}

/**
 * A takedown token, and the hash we keep.
 *
 * The token is returned to the browser once and never stored. Anyone holding
 * it can remove that card; anyone holding the database cannot.
 */
export function mintDeletionToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time, so a wrong token cannot be narrowed down by timing. */
export function tokensMatch(
  candidateHash: string,
  storedHash: string,
): boolean {
  const a = Buffer.from(candidateHash);
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Validate and re-encode.
 *
 * The dimension check happens on the DECODED image, which is also what makes
 * the size cap real: a small file can still declare enormous dimensions, and
 * a `Content-Type` of `image/jpeg` is worth nothing on its own.
 *
 * Re-encoding strips every ancillary chunk as a side effect — EXIF included.
 * The client's canvas output should carry none anyway, but "should" is not a
 * guarantee about bytes that arrived over the network.
 */
export async function normaliseImage(file: Blob): Promise<Buffer> {
  if (file.size > MAX_BYTES) throw new GalleryRejected("too_large");

  const input = Buffer.from(await file.arrayBuffer());

  // Dynamic import: sharp is a native module and has no business loading on
  // a request that never touches the wall.
  const sharp = (await import("sharp")).default;

  let image;
  let meta;
  try {
    image = sharp(input, { failOn: "error" });
    meta = await image.metadata();
  } catch {
    throw new GalleryRejected("not_an_image");
  }

  if (!meta.width || !meta.height) throw new GalleryRejected("not_an_image");
  if (meta.width > MAX_EDGE || meta.height > MAX_EDGE) {
    throw new GalleryRejected("too_big_dimensions");
  }

  // Re-encode rather than pass through. `rotate()` with no argument applies
  // any EXIF orientation before it is discarded, so the picture keeps the way
  // up it was submitted.
  return image.rotate().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

export function cleanNickname(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.length > MAX_NICKNAME) {
    throw new GalleryRejected("bad_nickname");
  }
  return value;
}

export function cleanLocale(raw: FormDataEntryValue | null): "fr" | "en" {
  if (raw !== "fr" && raw !== "en") throw new GalleryRejected("bad_locale");
  return raw;
}

/**
 * The consent, from the request.
 *
 * Only the FACT comes from the client. The wording is resolved server-side —
 * same rule as the refund acknowledgment (ADR 0022): a body that supplies its
 * own text could record agreement to something never shown.
 */
export function requireConsent(form: FormData): void {
  if (form.get("consent") !== "true") throw new GalleryRejected("no_consent");
}

/**
 * Where a new card lands.
 *
 * **Approved on arrival, by decision.** Asked for on 2026-09-03 and
 * reaffirmed: nobody should have to press anything for the wall to fill.
 * See ADR 0027 — it reverses the review-first rule of ADR 0026 and states
 * plainly what that costs.
 *
 * Setting `DP_GALLERY_REVIEW=1` puts the queue back, without a code change.
 */
export function initialStatus(): "approved" | "pending" {
  return process.env.DP_GALLERY_REVIEW === "1" ? "pending" : "approved";
}

/** Storage path. Generated id, never the nickname — that is user input. */
export function storagePath(id: string): string {
  return `${new Date().getFullYear()}/${id}.jpg`;
}

export async function storeCard(path: string, bytes: Buffer): Promise<void> {
  const supabase = createAdminSupabase();
  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`could not store the card: ${error.message}`);
}

/**
 * Remove the object.
 *
 * Called on rejection as well as takedown: a rejected face sitting in a
 * bucket is exactly the harm the review was meant to prevent.
 */
export async function removeCard(path: string): Promise<void> {
  const supabase = createAdminSupabase();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([path]);
  if (error)
    console.warn("[dp-gallery] could not remove object", error.message);
}

/** A short-lived URL for one approved card. */
export async function signedUrl(path: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) {
    console.warn("[dp-gallery] could not sign", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
