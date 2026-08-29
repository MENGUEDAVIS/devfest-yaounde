import type { ReactNode } from "react";

export type BadgeTone = "blue" | "green" | "yellow" | "red";
export type BadgeVariant = "solid" | "outline";

const SOLID_CLASSES: Record<BadgeTone, string> = {
  blue: "bg-blue-pastel text-blue",
  green: "bg-green-pastel text-green",
  yellow: "bg-yellow-pastel text-black02",
  red: "bg-red-pastel text-red",
};

/**
 * Outline variant — an Off White fill with a Black02 border, so the badge
 * stays visible on ANY brand surface. The solid pastel fills disappear when
 * the badge sits on a surface of the same pastel (a yellow badge on the
 * Pastel Yellow section wash was invisible), which is exactly the case the
 * yellow-dominant base theme makes common.
 */
const OUTLINE_CLASSES: Record<BadgeTone, string> = {
  blue: "border-2 border-blue bg-offwhite text-blue",
  green: "border-2 border-green bg-offwhite text-green",
  yellow: "border-2 border-black02 bg-offwhite text-black02",
  red: "border-2 border-red bg-offwhite text-red",
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Use `outline` whenever the badge sits on a coloured/pastel surface. */
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/**
 * DESIGN.md §5.2/§8: pill radius, Mono type. Shared primitive — ticket tiers
 * and shop status pills reuse this.
 *
 * Yellow uses black02 text (never yellow-on-pastel-yellow) to keep contrast
 * safe per DESIGN.md §2.8.
 */
export function Badge({
  tone = "blue",
  variant = "solid",
  children,
  className = "",
}: BadgeProps) {
  const toneClasses =
    variant === "outline" ? OUTLINE_CLASSES[tone] : SOLID_CLASSES[tone];
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 font-mono text-mono-tag font-bold uppercase tracking-wide ${toneClasses} ${className}`}
    >
      {children}
    </span>
  );
}
