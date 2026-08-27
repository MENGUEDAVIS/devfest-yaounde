import type { ReactNode } from "react";

export type SectionBackground =
  | "offwhite"
  | "pastel-blue"
  | "pastel-green"
  | "pastel-yellow"
  | "pastel-red"
  | "black02";

const BACKGROUND_CLASSES: Record<SectionBackground, string> = {
  offwhite: "bg-offwhite text-black02",
  "pastel-blue": "bg-blue-pastel text-black02",
  "pastel-green": "bg-green-pastel text-black02",
  "pastel-yellow": "bg-yellow-pastel text-black02",
  "pastel-red": "bg-red-pastel text-black02",
  black02: "bg-black02 text-offwhite",
};

// Tailwind's static scanner needs full literal class names — a template
// string like `max-w-${maxWidth}` would silently produce no CSS.
const MAX_WIDTH_CLASSES = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export interface SectionContainerProps {
  /** DESIGN.md §7: alternate Off White -> pastel wash -> Off White -> Black02 down a long scroll. */
  background?: SectionBackground;
  children: ReactNode;
  className?: string;
  /** Inner content max-width — narrower for text-heavy sections, wider for grids. */
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl";
  id?: string;
}

/**
 * Handles the DESIGN.md §7 section-rhythm background alternation so page
 * authors pick a background token instead of hand-coding colors per
 * section. Every section gets the same vertical rhythm and horizontal
 * gutters (24-32px desktop / 16px mobile, per DESIGN.md §7).
 */
export function SectionContainer({
  background = "offwhite",
  children,
  className = "",
  maxWidth = "5xl",
  id,
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={`${BACKGROUND_CLASSES[background]} ${className}`}
    >
      <div
        className={`mx-auto ${MAX_WIDTH_CLASSES[maxWidth]} px-4 py-16 sm:px-6 sm:py-24`}
      >
        {children}
      </div>
    </section>
  );
}
