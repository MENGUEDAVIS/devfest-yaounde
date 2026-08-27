import type { Icon, IconWeight } from "@phosphor-icons/react";

/**
 * DESIGN.md §3 sizing scale — only these five sizes are on-brand.
 */
export type IconSize = 16 | 20 | 24 | 32 | 48;

export interface IconWrapperProps {
  /** A Phosphor icon component, e.g. `CalendarBlank` from "@phosphor-icons/react". */
  icon: Icon;
  /** DESIGN.md §3: 16 inline text, 20 buttons/forms, 24 default UI, 32 feature callouts, 48+ hero/illustrative. */
  size?: IconSize;
  /**
   * DESIGN.md §3: Regular = everyday UI, Bold = emphasis/active state,
   * Duotone = feature highlights/fun moments, Fill = active/toggled state only.
   */
  weight?: IconWeight;
  className?: string;
  "aria-label"?: string;
  /** Set true for purely decorative icons sitting next to their own text label. */
  "aria-hidden"?: boolean;
}

/**
 * Enforces the DESIGN.md §3 sizing scale and weight vocabulary — always use
 * this instead of importing a Phosphor icon directly with a freehand size.
 */
export function IconWrapper({
  icon: Icon,
  size = 24,
  weight = "regular",
  className,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: IconWrapperProps) {
  return (
    <Icon
      size={size}
      weight={weight}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
    />
  );
}
