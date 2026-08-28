import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonTone = "yellow" | "black02" | "offwhite" | "blue" | "green";
export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "lg" | "md";
export type ButtonRadius = "pill" | "lg";

/**
 * Yellow is the default and the dominant brand tone (DESIGN.md §2.5).
 * Blue/green stay available for the sparing semantic cases only — don't
 * reach for them just to make a section look different.
 */
const FILLED_CLASSES: Record<ButtonTone, string> = {
  yellow: "bg-yellow text-black02 hover:bg-yellow-halftone",
  black02: "bg-black02 text-offwhite hover:bg-black02/90",
  offwhite: "bg-offwhite text-black02 hover:bg-yellow-halftone",
  blue: "bg-blue text-offwhite hover:bg-blue-halftone hover:text-black02",
  green: "bg-green text-offwhite hover:bg-green-halftone hover:text-black02",
};

const OUTLINE_CLASSES: Record<ButtonTone, string> = {
  yellow: "border-black02 text-black02 hover:bg-yellow",
  black02: "border-black02 text-black02 hover:bg-black02 hover:text-offwhite",
  offwhite:
    "border-offwhite text-offwhite hover:bg-offwhite hover:text-black02",
  blue: "border-blue text-blue hover:bg-blue hover:text-offwhite",
  green: "border-green text-green hover:bg-green hover:text-offwhite",
};

/** §7b: chunky. ~18-24px vertical, ~32-40px horizontal, 18px+ bold label. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: "px-9 py-4 text-body-l",
  md: "px-7 py-3 text-body-m",
};

const RADIUS_CLASSES: Record<ButtonRadius, string> = {
  pill: "rounded-pill",
  lg: "rounded-lg",
};

interface CommonProps {
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  className?: string;
  children: ReactNode;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  external?: boolean;
  onClick?: () => void;
  type?: never;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  external?: never;
  onClick?: () => void;
  type?: "button" | "submit";
}

export type ButtonProps = ButtonAsLink | ButtonAsButton;

/**
 * DESIGN.md §7b/§8. Deliberately oversized and confident — a primary CTA
 * must never read as a default HTML button. Press feedback uses the bouncy
 * easing token (§6.1) with a real lift on hover and a visible squash on
 * press, so the motion is actually felt (§7c).
 */
export function Button({
  tone = "yellow",
  variant = "primary",
  size = "lg",
  radius = "pill",
  className = "",
  children,
  href,
  external,
  onClick,
  type = "button",
}: ButtonProps) {
  const base = [
    "group inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-bold",
    "transition-[transform,background-color,box-shadow] duration-200",
    "ease-bouncy",
    "hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_var(--color-black02)]",
    "active:translate-y-0.5 active:shadow-none active:scale-[0.97]",
    "motion-reduce:transform-none motion-reduce:transition-none",
    SIZE_CLASSES[size],
    RADIUS_CLASSES[radius],
  ].join(" ");

  const toneClasses =
    variant === "primary"
      ? FILLED_CLASSES[tone]
      : `border-2 bg-transparent ${OUTLINE_CLASSES[tone]}`;

  const classes = `${base} ${toneClasses} ${className}`;

  if (href) {
    if (external) {
      return (
        <a href={href} onClick={onClick} className={classes}>
          {children}
        </a>
      );
    }
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
