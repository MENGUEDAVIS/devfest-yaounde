import type { ReactNode } from "react";

export type BadgeTone = "primary" | "blue" | "success" | "danger";
export type BadgeVariant = "solid" | "outline";

const SOLID_CLASSES: Record<BadgeTone, string> = {
  /** Follows the active theme (DESIGN.md §2.5). */
  primary: "bg-pastel text-black02",
  blue: "bg-blue-pastel text-blue",
  /** FIXED status colours — never themed, so meaning survives a theme swap. */
  success: "bg-success-pastel text-success",
  danger: "bg-danger-pastel text-danger",
};

/**
 * Outline variant — an Off White fill with a Black02 border, so the badge
 * stays visible on ANY brand surface. The solid pastel fills disappear when
 * the badge sits on a surface of the same pastel (a yellow badge on the
 * Pastel Yellow section wash was invisible), which is exactly the case the
 * yellow-dominant base theme makes common.
 */
const OUTLINE_CLASSES: Record<BadgeTone, string> = {
  primary: "border-2 border-black02 bg-offwhite text-black02",
  blue: "border-2 border-blue bg-offwhite text-blue",
  success: "border-2 border-success bg-offwhite text-success",
  danger: "border-2 border-danger bg-offwhite text-danger",
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
 * `primary` follows the active theme; `success`/`danger` are FIXED status
 * colours that never theme, so "in stock" stays green and "sold out" stays
 * red whichever family is dominant (DESIGN.md §2.5).
 *
 * The primary tone uses black02 text rather than the theme colour on its own
 * pastel, which keeps contrast safe across all four themes (§2.8).
 */
export function Badge({
  tone = "primary",
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
