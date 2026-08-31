/**
 * DP generator — canvas compositing.
 *
 * Runs entirely in the browser. The photo is read with `createImageBitmap`
 * from a local File and drawn to a canvas; it is never uploaded, so there is
 * no server copy, no EXIF to strip and no retention question to answer.
 * See docs/decisions/0015-dp-generator-client-side.md.
 *
 * No image library: the whole job is one draw call inside a clip path.
 */
import { DEFAULT_FRAME_ID, findFrame, type DpFrame } from "./frames";

/** Square output, sized for a social avatar without being wasteful. */
export const DP_SIZE = 1080;

/** Reject files that are not really images, or are large enough to hurt. */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

export interface DpTransform {
  /** 1 = photo fits the frame. Higher zooms in. */
  scale: number;
  /** Pan, in fractions of the frame size, from the centre. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_TRANSFORM: DpTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export interface DpComposeInput {
  photo: ImageBitmap;
  frameId?: string;
  /** Free-form display name — no real-name requirement (PAGES.md §9). */
  nickname: string;
  transform?: DpTransform;
  size?: number;
}

export class DpImageError extends Error {
  constructor(readonly code: "unsupported_type" | "too_large" | "unreadable") {
    super(code);
    this.name = "DpImageError";
  }
}

/**
 * Turns a picked File into a bitmap, validating first.
 *
 * The validation is a UX guard, not a security control — nothing leaves the
 * device, so a malformed file can only spoil the user's own render.
 */
export async function loadPhoto(file: File): Promise<ImageBitmap> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    throw new DpImageError("unsupported_type");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DpImageError("too_large");
  }
  try {
    return await createImageBitmap(file);
  } catch {
    throw new DpImageError("unreadable");
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function clipToMask(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  box: { x: number; y: number; size: number },
) {
  if (frame.mask === "circle") {
    ctx.beginPath();
    ctx.arc(
      box.x + box.size / 2,
      box.y + box.size / 2,
      box.size / 2,
      0,
      Math.PI * 2,
    );
    ctx.closePath();
  } else {
    roundedRectPath(ctx, box.x, box.y, box.size, box.size, box.size * 0.14);
  }
}

/**
 * Draws the photo to COVER the mask box — the short edge fills, the long edge
 * overflows and is clipped. Scale and pan ride on top of that baseline, so
 * "scale 1, no offset" always produces a sensibly framed portrait.
 */
function drawCovered(
  ctx: CanvasRenderingContext2D,
  photo: ImageBitmap,
  box: { x: number; y: number; size: number },
  transform: DpTransform,
) {
  const cover = Math.max(box.size / photo.width, box.size / photo.height);
  const scale = cover * Math.max(transform.scale, 0.1);

  const drawWidth = photo.width * scale;
  const drawHeight = photo.height * scale;

  const centreX = box.x + box.size / 2 + transform.offsetX * box.size;
  const centreY = box.y + box.size / 2 + transform.offsetY * box.size;

  ctx.drawImage(
    photo,
    centreX - drawWidth / 2,
    centreY - drawHeight / 2,
    drawWidth,
    drawHeight,
  );
}

/**
 * Renders the whole card onto a canvas. Exposed separately from
 * `composeDp` so a live preview can draw into an on-screen canvas at a
 * smaller size without producing a Blob on every pointer move.
 */
export function renderDp(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  input: DpComposeInput,
): void {
  const size = input.size ?? DP_SIZE;
  const frame = findFrame(input.frameId ?? DEFAULT_FRAME_ID);
  if (!frame) throw new Error(`unknown frame: ${input.frameId}`);

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("2d canvas context unavailable");

  const transform = input.transform ?? DEFAULT_TRANSFORM;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, size, size);

  // Photo box: generous margins, nudged up to leave room for the nickname.
  const margin = size * 0.09;
  const box = {
    x: margin,
    y: margin,
    size: size - margin * 2 - size * 0.14,
  };

  ctx.save();
  clipToMask(ctx, frame, box);
  ctx.clip();
  drawCovered(ctx, input.photo, box, transform);
  ctx.restore();

  // Accent ring, drawn on the same path so it hugs whichever mask is active.
  ctx.save();
  clipToMask(ctx, frame, box);
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = size * 0.018;
  ctx.stroke();
  ctx.restore();

  // Nickname.
  const nickname = input.nickname.trim().slice(0, 28);
  if (nickname) {
    ctx.fillStyle = frame.foreground;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(size * 0.062)}px "Google Sans", "Product Sans", Inter, system-ui, sans-serif`;
    ctx.fillText(
      nickname,
      size / 2,
      box.y + box.size + size * 0.055,
      size * 0.86,
    );
  }

  // Wordmark.
  ctx.fillStyle = frame.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${Math.round(size * 0.03)}px "Google Sans Mono", ui-monospace, monospace`;
  ctx.fillText("DEVFEST YAOUNDE", size / 2, size - size * 0.038, size * 0.86);
}

/** Renders and hands back a PNG Blob, ready for a download link. */
export async function composeDp(input: DpComposeInput): Promise<Blob> {
  const size = input.size ?? DP_SIZE;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(size, size);
    renderDp(canvas, input);
    return canvas.convertToBlob({ type: "image/png" });
  }

  const canvas = document.createElement("canvas");
  renderDp(canvas, input);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("canvas produced no blob")),
      "image/png",
    );
  });
}

/** Filename for the download. Kept ASCII-safe for awkward mobile browsers. */
export function dpFileName(nickname: string): string {
  const slug =
    nickname
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 32) || "devfest";
  return `devfest-yaounde-${slug}.png`;
}
