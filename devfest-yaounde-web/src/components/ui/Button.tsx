import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonTone =
  "primary" | "black02" | "offwhite" | "blue" | "success";
export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "lg" | "md";
export type ButtonRadius = "pill" | "lg";

/**
 * `primary` follows the ACTIVE THEME and is the default (DESIGN.md §2.5).
 * `success` is a FIXED status colour, not themed. Blue stays available for
 * the sparing semantic case only — don't reach for it to make a section
 * look different.
 */
const FILLED_CLASSES: Record<ButtonTone, string> = {
  primary: "bg-primary text-black02 hover:bg-halftone",
  black02: "bg-black02 text-offwhite hover:bg-black02/90",
  offwhite: "bg-offwhite text-black02 hover:bg-halftone",
  blue: "bg-blue text-offwhite hover:bg-blue-halftone hover:text-black02",
  success:
    "bg-success text-offwhite hover:bg-green-halftone hover:text-black02",
};

const OUTLINE_CLASSES: Record<ButtonTone, string> = {
  primary: "border-black02 text-black02 hover:bg-primary",
  black02: "border-black02 text-black02 hover:bg-black02 hover:text-offwhite",
  offwhite:
    "border-offwhite text-offwhite hover:bg-offwhite hover:text-black02",
  blue: "border-blue text-blue hover:bg-blue hover:text-offwhite",
  success: "border-success text-success hover:bg-success hover:text-offwhite",
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
  /** `never`, so the union destructures — see the note on the button variant. */
  disabled?: never;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  external?: never;
  onClick?: () => void;
  type?: "button" | "submit";
  /**
   * Buttons only. A link cannot be meaningfully disabled — `aria-disabled` on
   * an anchor still navigates — so the link variant deliberately has no such
   * prop: if an action is unavailable, don't render a link to it.
   */
  disabled?: boolean;
}

export type ButtonProps = ButtonAsLink | ButtonAsButton;

/**
 * DESIGN.md §7b/§8. Deliberately oversized and confident — a primary CTA
 * must never read as a default HTML button. Press feedback uses the bouncy
 * easing token (§6.1) with a real lift on hover and a visible squash on
 * press, so the motion is actually felt (§7c).
 */
export function Button({
  tone = "primary",
  variant = "primary",
  size = "lg",
  radius = "pill",
  className = "",
  children,
  href,
  disabled,
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

  /* Disabled buttons drop the lift and the press, because a control that
     animates but does nothing reads as broken rather than unavailable. */
  const disabledClasses = disabled
    ? "cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none active:translate-y-0 active:scale-100"
    : "";

  const classes = `${base} ${toneClasses} ${disabledClasses} ${className}`;

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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
