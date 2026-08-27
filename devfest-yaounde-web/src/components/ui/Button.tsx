import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonTone = "blue" | "green" | "yellow" | "red" | "black02";
export type ButtonVariant = "primary" | "secondary";
export type ButtonRadius = "pill" | "md";

const FILLED_CLASSES: Record<ButtonTone, string> = {
  blue: "bg-blue text-offwhite",
  green: "bg-green text-offwhite",
  yellow: "bg-yellow text-black02",
  red: "bg-red text-offwhite",
  black02: "bg-black02 text-offwhite",
};

const OUTLINE_CLASSES: Record<ButtonTone, string> = {
  blue: "border-blue text-blue hover:bg-blue-pastel",
  green: "border-green text-green hover:bg-green-pastel",
  yellow: "border-yellow text-black02 hover:bg-yellow-pastel",
  red: "border-red text-red hover:bg-red-pastel",
  black02: "border-black02 text-black02 hover:bg-black02/5",
};

const RADIUS_CLASSES: Record<ButtonRadius, string> = {
  pill: "rounded-pill",
  md: "rounded-md",
};

interface CommonProps {
  tone?: ButtonTone;
  variant?: ButtonVariant;
  radius?: ButtonRadius;
  className?: string;
  children: ReactNode;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  onClick?: () => void;
  type?: never;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
}

export type ButtonProps = ButtonAsLink | ButtonAsButton;

/**
 * DESIGN.md §5.2/§8: pill or md radius, bouncy press feel (DESIGN.md §6.1
 * lists "buttons on click" under Bouncy/Spring — applied here as a
 * hover-lift + active-press transform, not the one-shot bouncyPop entrance
 * keyframe, since a press is an ongoing interaction state, not an entrance).
 * `tone` picks the core color (map it to the relevant section color per
 * DESIGN.md §2.5 — e.g. yellow for a Tickets CTA, green for Shop).
 */
export function Button({
  tone = "blue",
  variant = "primary",
  radius = "pill",
  className = "",
  children,
  href,
  onClick,
  type = "button",
}: ButtonProps) {
  const base = `inline-flex items-center justify-center whitespace-nowrap px-5 py-2.5 text-body-m font-bold font-sans transition-transform duration-150 ease-[var(--ease-bouncy)] hover:scale-[1.03] active:scale-95 ${RADIUS_CLASSES[radius]}`;
  const toneClasses =
    variant === "primary"
      ? FILLED_CLASSES[tone]
      : `border-2 bg-transparent ${OUTLINE_CLASSES[tone]}`;
  const classes = `${base} ${toneClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
