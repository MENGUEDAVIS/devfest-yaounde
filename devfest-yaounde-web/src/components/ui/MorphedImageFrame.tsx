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

/**
 * Initials, for a person with no photograph yet.
 *
 * Two letters at most: more than that stops reading as a monogram and starts
 * reading as truncated text.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map((w) => [...w][0]?.toUpperCase() ?? "").join("");
}

export function MorphedImageFrame({
  src,
  alt,
  shape = "rounded",
  aspectRatio = "1/1",
  className = "",
}: MorphedImageFrameProps) {
  const shapeClass = shape === "circle" ? "rounded-pill" : "rounded-lg";

  /*
   * NO SRC IS A REAL STATE, not an error to render badly.
   *
   * The organiser roster ships without photographs — they could not be pulled
   * from the chapter listing and are uploaded later — so `photoUrl` is
   * legitimately empty for now. An `<img src="">` is the worst possible
   * response to that: browsers resolve the empty string against the CURRENT
   * PAGE, request the whole HTML document again, and then draw a broken-image
   * icon over someone's name. Initials on the brand's own pastel are honest
   * and look deliberate, and the photograph replaces them the moment one is
   * attached — no call site changes.
   */
  const missing = !src || src.trim() === "";

  return (
    <div
      className={`overflow-hidden ${shapeClass} ${className}`}
      style={{ aspectRatio }}
    >
      {missing ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center bg-pastel"
        >
          <span
            aria-hidden
            className="font-sans text-heading-l font-bold text-black02/45"
          >
            {initialsOf(alt)}
          </span>
        </div>
      ) : (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
