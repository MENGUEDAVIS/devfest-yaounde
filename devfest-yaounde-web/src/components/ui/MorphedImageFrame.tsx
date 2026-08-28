/* eslint-disable @next/next/no-img-element -- frame renders arbitrary local/remote photo URLs from content JSON; next/image optimization isn't wired for these yet */

/**
 * DESIGN.md §4.2 interim directive: the two-rectangle-union morphed frame
 * has been repeatedly implemented wrong, so we deliberately render a CLEAN
 * PLAIN SHAPE for now — a rounded rectangle (radius-lg) or a circle — with
 * the image properly filling it. An honest plain shape beats a broken
 * signature shape.
 *
 * This stays a single component so the real morphed clip-path can be
 * swapped in later by editing ONLY this file — every call site keeps
 * working untouched. Do not re-fake the morph, and do not scatter one-off
 * image containers elsewhere.
 */
export type FrameShape = "rounded" | "circle";

export interface MorphedImageFrameProps {
  src: string;
  /** Required — these wrap real community photos. */
  alt: string;
  /** "rounded" (radius-lg) by default; "circle" for avatars. */
  shape?: FrameShape;
  /** CSS aspect-ratio for the frame, e.g. "1/1" (default) or "4/3". */
  aspectRatio?: string;
  className?: string;
}

export function MorphedImageFrame({
  src,
  alt,
  shape = "rounded",
  aspectRatio = "1/1",
  className = "",
}: MorphedImageFrameProps) {
  const shapeClass = shape === "circle" ? "rounded-pill" : "rounded-lg";

  return (
    <div
      className={`overflow-hidden ${shapeClass} ${className}`}
      style={{ aspectRatio }}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
