import { feeInclusiveAmount } from "@/lib/payments/fees";

const xaf = (value: number) => `${value.toLocaleString("en-CM")} XAF`;

const BASE_TIP =
  "Base price: what is stored, and what you edit. It never includes the fee.";
const DISPLAYED_TIP =
  "Displayed price: what visitors see and are charged — the base plus the 1.5% transaction fee, rounded up to the next 50 XAF.";

/**
 * The two prices an admin has to keep straight, side by side and labelled
 * (PHASE23 feedback): the BASE price they type and the DISPLAYED price a
 * visitor sees and is charged. Both come from the same `feeInclusiveAmount`
 * the storefront and checkout use, so this can never show a number the site
 * does not.
 *
 * `inline` is for a list row — two short labelled figures that wrap rather than
 * truncate (a clipped price is worse than a second line). `panel` is for the
 * edit form, under the price field, and updates as the field is typed into.
 */
export function PriceReadout({
  base,
  layout = "inline",
}: {
  base: number;
  layout?: "inline" | "panel";
}) {
  const free = base <= 0;
  const displayed = feeInclusiveAmount(base);

  if (layout === "inline") {
    return (
      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <span title={BASE_TIP}>
          <span className="mr-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/65">
            Base
          </span>
          <span className="font-sans text-body-m font-bold text-black02">
            {free ? "Free" : xaf(base)}
          </span>
        </span>
        <span title={DISPLAYED_TIP}>
          <span className="mr-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/65">
            Displayed
          </span>
          <span className="font-sans text-body-m font-bold text-black02">
            {free ? "Free" : xaf(displayed)}
          </span>
        </span>
      </span>
    );
  }

  return (
    <div
      className="mt-2 grid gap-2 sm:grid-cols-2"
      aria-live="polite"
      aria-label="Base price and displayed price"
    >
      <div className="rounded-lg border border-black02/20 bg-offwhite px-4 py-3">
        <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/65">
          Base price — what you enter
        </p>
        <p className="mt-1 font-sans text-heading-m font-bold text-black02">
          {free ? "Free" : xaf(base)}
        </p>
        <p className="mt-1 text-caption text-black02/65">
          Stored exactly as typed. Never includes the fee.
        </p>
      </div>
      <div className="rounded-lg border-2 border-black02 bg-pastel px-4 py-3">
        <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/65">
          Displayed price — what visitors pay
        </p>
        <p className="mt-1 font-sans text-heading-m font-bold text-black02">
          {free ? "Free" : xaf(displayed)}
        </p>
        <p className="mt-1 text-caption text-black02/65">
          {free
            ? "A free item stays free — no fee, no rounding."
            : `Base + 1.5% fee, rounded up to the next 50 XAF (${xaf(displayed - base)} on top).`}
        </p>
      </div>
    </div>
  );
}
