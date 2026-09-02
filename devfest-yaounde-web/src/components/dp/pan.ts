import type { DpTransform } from "@/lib/dp/compose";

/**
 * Zoom range for the crop control.
 *
 * The floor is 1 and not lower on purpose: `renderDp` draws the photo to
 * COVER the mask, so scale 1 is already "no gaps". Allowing less would let
 * the frame's background show through the middle of a portrait, which reads
 * as a broken render rather than as a choice.
 */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

/**
 * How far the photo may be panned before its own edge would slide into the
 * mask and expose the background.
 *
 * The arithmetic never needs the photo box's size, because it cancels:
 * `renderDp` covers the box, so the drawn image measures
 * `(edge / short edge) * scale` BOXES across, and offsets are already
 * expressed in fractions of a box. The slack on either side is therefore half
 * of that minus one — pure aspect ratio and zoom.
 *
 * That is the reason to compute it here rather than copy the margins out of
 * the compositor: there is no geometry constant to fall out of sync with. If
 * the photo box in `renderDp` is ever resized, this keeps working untouched.
 */
export function panLimits(
  photo: { width: number; height: number },
  scale: number,
): { x: number; y: number } {
  const short = Math.min(photo.width, photo.height);
  if (short <= 0) return { x: 0, y: 0 };
  return {
    x: Math.max(0, ((photo.width / short) * scale - 1) / 2),
    y: Math.max(0, ((photo.height / short) * scale - 1) / 2),
  };
}

/**
 * Pull a transform back inside the legal range.
 *
 * Every control that can move the crop — drag, arrow keys, the zoom slider —
 * goes through this, so none of them can produce a state the others cannot.
 * Zooming back out is the case that makes it necessary: an offset that was
 * fine at 2.4x would hang off the edge at 1.2x, so the pan has to follow the
 * zoom down rather than wait to be corrected by the next drag.
 */
export function clampTransform(
  photo: { width: number; height: number },
  transform: DpTransform,
): DpTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale));
  const limit = panLimits(photo, scale);
  return {
    scale,
    offsetX: Math.min(limit.x, Math.max(-limit.x, transform.offsetX)),
    offsetY: Math.min(limit.y, Math.max(-limit.y, transform.offsetY)),
  };
}
