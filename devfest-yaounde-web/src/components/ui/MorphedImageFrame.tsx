import { useId } from "react";

export interface MorphedImageFrameProps {
  src: string;
  /** Required — these wrap real community photos, never decorative-only. */
  alt: string;
  /**
   * Degrees between the two rectangles (DESIGN.md §4.2: 15-35°). Omit to
   * derive a stable pseudo-random value from `src`+`alt`, so repeated
   * instances don't look identical but stay stable across re-renders/SSR
   * (a true Math.random() here would both violate render purity and cause
   * a server/client mismatch).
   */
  rotation?: number;
  /** CSS aspect-ratio for the frame, e.g. "1/1" (default) or "4/3". */
  aspectRatio?: string;
  className?: string;
}

function seededAngle(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
}

/**
 * DESIGN.md §4.2 signature shape: a photo masked into the union of two
 * overlapping rounded rectangles, rotated 15-35° apart. Built as an inline
 * SVG <mask> — two white rounded rects drawn into one mask naturally union
 * (any pixel covered by *either* rect is visible), no boolean-geometry
 * library needed.
 *
 * Use for: speaker/organizer photos, past-event galleries. Never for UI
 * screenshots or informational imagery (DESIGN.md §4.2).
 */
export function MorphedImageFrame({
  src,
  alt,
  rotation,
  aspectRatio = "1/1",
  className = "",
}: MorphedImageFrameProps) {
  const rawId = useId();
  const maskId = `morphed-frame-${rawId.replace(/[:]/g, "")}`;
  const angle = rotation ?? seededAngle(`${src}:${alt}`, 15, 35);

  return (
    <div className={className} style={{ aspectRatio }}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        role="img"
        aria-label={alt}
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
          >
            <rect x="6" y="6" width="88" height="88" rx="28" fill="white" />
            <rect
              x="6"
              y="6"
              width="88"
              height="88"
              rx="28"
              fill="white"
              transform={`rotate(${angle} 50 50)`}
            />
          </mask>
        </defs>
        <image
          href={src}
          x="0"
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
