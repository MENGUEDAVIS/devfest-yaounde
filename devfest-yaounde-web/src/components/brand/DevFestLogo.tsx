"use client";

import { useState } from "react";
import {
  MARK_LEFT,
  MARK_RIGHT,
  MARK_STROKE_WIDTH,
  MARK_VIEWBOX,
  type MarkPath,
} from "@/lib/brand/devfest-mark";

/**
 * The DevFest "><" mark, inlined as SVG so each bracket half is a real,
 * animatable element rather than a flat raster.
 *
 * Source: GDG/DevFest brand asset (see docs/decisions/0006-logo-assets.md).
 * The four paths are the two bracket halves — left = red + blue, right =
 * yellow + green — matching the separate `d-logo-left/right.png` files.
 * They're grouped here so the halves can split, snap, and spin apart.
 *
 * The path data itself lives in `@/lib/brand/devfest-mark`, because the DP
 * generator draws the same mark onto a canvas where there is no SVG. Two
 * copies of a logo is how a brand asset quietly drifts.
 *
 * Brand-color note: this mark is legitimately multi-color because it's the
 * inherited GDG logo. DESIGN.md §2.5's yellow-dominant rule governs OUR
 * surfaces (backgrounds, CTAs, accents), not the brand mark itself — so
 * this is not a rainbow-section violation.
 *
 * Structure is intentionally two nested <g> per half: the OUTER group owns
 * the entrance/easter-egg animation, the INNER group owns the hover
 * transition. Sharing one element would mean a `both`-filled animation
 * permanently winning over the hover transform.
 */
export interface DevFestLogoProps {
  className?: string;
  /** Play the split-and-snap entrance on mount. */
  animateIn?: boolean;
  /** Enable hover parting + the click-to-spin easter egg. */
  interactive?: boolean;
  title?: string;
}

const SPIN_MS = 1100;

export function DevFestLogo({
  className = "",
  animateIn = false,
  interactive = false,
  title,
}: DevFestLogoProps) {
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    if (!interactive || spinning) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), SPIN_MS);
  }

  const leftOuter = spinning
    ? "logo-spin-left"
    : animateIn
      ? "logo-bracket-in-left"
      : "";
  const rightOuter = spinning
    ? "logo-spin-right"
    : animateIn
      ? "logo-bracket-in-right"
      : "";

  return (
    <svg
      viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${interactive ? "logo-interactive" : ""} ${className}`}
      onClick={handleClick}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      // Overflow must stay visible or the split/spin gets clipped by viewBox
      style={{ overflow: "visible" }}
    >
      <g className={`logo-piece ${leftOuter}`}>
        <g className="logo-hover-left">{MARK_LEFT.map(piece)}</g>
      </g>

      <g className={`logo-piece ${rightOuter}`}>
        <g className="logo-hover-right">{MARK_RIGHT.map(piece)}</g>
      </g>
    </svg>
  );
}

function piece({ d, fill }: MarkPath) {
  return (
    <path
      key={fill}
      d={d}
      fill={fill}
      stroke="#1E1E1E"
      strokeWidth={MARK_STROKE_WIDTH}
      strokeMiterlimit="10"
    />
  );
}
