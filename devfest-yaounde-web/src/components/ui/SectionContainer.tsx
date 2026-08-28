import type { ReactNode } from "react";

/**
 * DESIGN.md §2.5 + §7: yellow is the through-line. The rhythm alternates
 * Pastel Yellow wash -> Off White -> Pastel Yellow -> Black02 dark band.
 * Accent backgrounds exist for the rare semantic case only — a section
 * should not pick blue/green just to look different from its neighbour.
 */
export type SectionBackground =
  "yellow-wash" | "offwhite" | "yellow" | "black02";

const BACKGROUND_CLASSES: Record<SectionBackground, string> = {
  "yellow-wash": "bg-yellow-pastel text-black02",
  offwhite: "bg-offwhite text-black02",
  yellow: "bg-yellow text-black02",
  black02: "bg-black02 text-offwhite",
};

// Tailwind's static scanner needs full literal class names — a template
// string like `max-w-${maxWidth}` would silently produce no CSS.
const MAX_WIDTH_CLASSES = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export interface SectionContainerProps {
  background?: SectionBackground;
  children: ReactNode;
  className?: string;
  /** Inner content max-width — narrower for text-heavy sections, wider for grids. */
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  id?: string;
}

/**
 * Handles background rhythm and the §7b spacing bar (96-160px desktop
 * vertical padding) so exaggerated type has room to read as confident
 * rather than cramped.
 */
export function SectionContainer({
  background = "yellow-wash",
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
        className={`mx-auto ${MAX_WIDTH_CLASSES[maxWidth]} px-5 py-24 sm:px-8 sm:py-32 lg:py-40`}
      >
        {children}
      </div>
    </section>
  );
}
