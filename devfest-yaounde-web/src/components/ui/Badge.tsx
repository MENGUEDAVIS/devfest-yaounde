import type { ReactNode } from "react";

export type BadgeTone = "blue" | "green" | "yellow" | "red";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: "bg-blue-pastel text-blue",
  green: "bg-green-pastel text-green",
  yellow: "bg-yellow-pastel text-black02",
  red: "bg-red-pastel text-red",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/**
 * DESIGN.md §5.2/§8: pill radius, pastel background + core-color text, Mono
 * type. Shared primitive — ticket tiers and shop status pills reuse this.
 * Yellow uses black02 text (not yellow-on-pastel-yellow) to keep contrast
 * safe, per DESIGN.md §2.6.
 */
export function Badge({ tone = "blue", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 font-mono text-mono-tag uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
