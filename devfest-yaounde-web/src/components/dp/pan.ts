import type { DpTransform } from "@/lib/dp/compose";

/**
 * Zoom range for the crop control.
 *
 * The floor is 1 and not lower on purpose: `renderDp` draws the photo to
 * COVER the box, so scale 1 is already "no gaps". Allowing less would let the
 * card's pattern show through the middle of a portrait, which reads as a
 * broken render rather than as a choice.
 */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

export interface Box {
  w: number;
  h: number;
}

/**
 * How far the photo may be panned before its own edge would slide into the
 * box and expose what is behind it.
 *
 * Offsets are fractions of the box's own width and height, so the slack is
 * half of "how many boxes wide the drawn image is", minus one. The units
 * cancel, which means the box can be given in any consistent unit — the crop
 * control passes CSS pixels, the compositor passes card pixels, and both get
 * the same answer.
 */
export function panLimits(
  photo: { width: number; height: number },
  scale: number,
  box: Box,
): { x: number; y: number } {
  if (box.w <= 0 || box.h <= 0) return { x: 0, y: 0 };
  const cover = Math.max(box.w / photo.width, box.h / photo.height);
  const drawW = photo.width * cover * scale;
  const drawH = photo.height * cover * scale;
  return {
    x: Math.max(0, (drawW - box.w) / (2 * box.w)),
    y: Math.max(0, (drawH - box.h) / (2 * box.h)),
  };
}

/**
 * Pull a transform back inside the legal range.
 *
 * Every control that can move the crop — drag, arrow keys, the zoom slider,
 * and switching the card's aspect ratio — goes through this, so none of them
 * can produce a state the others cannot. Zooming back out is the case that
 * makes it necessary: an offset that was fine at 2.4x would hang off the edge
 * at 1.2x, so the pan has to follow the zoom down rather than wait to be
 * corrected by the next drag. Changing ratio is the same problem sideways.
 */
export function clampTransform(
  photo: { width: number; height: number },
  transform: DpTransform,
  box: Box,
): DpTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale));
  const limit = panLimits(photo, scale, box);
  return {
    scale,
    offsetX: Math.min(limit.x, Math.max(-limit.x, transform.offsetX)),
    offsetY: Math.min(limit.y, Math.max(-limit.y, transform.offsetY)),
  };
}

/** How far past the limit a drag has been pushed, for the rubber band. */
export function overshootOf(
  photo: { width: number; height: number },
  transform: DpTransform,
  box: Box,
): { x: number; y: number } {
  const limit = panLimits(photo, transform.scale, box);
  const over = (v: number, max: number) =>
    v > max ? v - max : v < -max ? v + max : 0;
  return {
    x: over(transform.offsetX, limit.x),
    y: over(transform.offsetY, limit.y),
  };
}
