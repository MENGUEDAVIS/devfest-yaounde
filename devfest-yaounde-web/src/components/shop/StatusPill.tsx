import {
  CheckCircle,
  Clock,
  MapPin,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ProductStatus } from "@/data/types";

/**
 * Product availability, as text + icon + colour — never colour alone
 * (DESIGN.md §2.6). Someone who cannot distinguish the fills still reads
 * "Sold out" and sees a different glyph.
 *
 * The two unbuyable states use the FIXED danger/neutral tokens rather than
 * the theme, so "sold out" does not turn reassuringly green under a Green
 * theme.
 */
const STATUS = {
  "in-stock": {
    Icon: CheckCircle,
    classes: "border-success bg-success-pastel text-success",
  },
  "pre-order": { Icon: Clock, classes: "border-blue bg-blue-pastel text-blue" },
  "venue-only": {
    Icon: MapPin,
    classes: "border-black02 bg-pastel text-black02",
  },
  "sold-out": {
    Icon: XCircle,
    classes: "border-danger bg-danger-pastel text-danger",
  },
} as const;

/** Which statuses can be bought here. Enforced server-side too. */
export const BUYABLE: ProductStatus[] = ["in-stock", "pre-order"];

export function StatusPill({
  status,
  label,
}: {
  status: ProductStatus;
  label: string;
}) {
  const { Icon, classes } = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border-2 px-3 py-1 font-mono text-mono-tag font-bold uppercase tracking-wide ${classes}`}
    >
      <Icon size={14} weight="bold" aria-hidden />
      {label}
    </span>
  );
}
