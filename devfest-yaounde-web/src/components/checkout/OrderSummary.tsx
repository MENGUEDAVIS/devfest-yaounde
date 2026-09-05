"use client";

import { CaretDown, CircleNotch, Tag, X } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

export interface SummaryLine {
  id: string;
  label: string;
  sublabel?: string;
  quantity: number;
  amount: number;
}

/** What the server said this basket costs. Null until a code is applied. */
export interface AppliedDiscount {
  code: string;
  /** Whole XAF taken off. Always the server's number, never computed here. */
  amount: number;
  /** What is left to pay. Also the server's. */
  charged: number;
}

/**
 * The sticky "Your order" card — shared by tickets and shop.
 *
 * The DISCOUNT FIELD LIVES HERE, not in a step of its own. Most people do not
 * have a code, and a whole step asking about something most people skip is a
 * step that mostly gets clicked through.
 *
 * **Applying a code prices it immediately** (`POST /api/checkout/quote`). It
 * used to only stage the code, with the deduction revealed on the payment
 * page — which meant the first honest total appeared after the point of no
 * return. `GAPS.md` G4 had ruled a preview endpoint out as an oracle for
 * guessing codes; ADR 0036 reverses that, because the oracle already existed
 * behind checkout and the real fence was always the rate limit.
 *
 * Every number in the discount rows comes from the server. This component
 * does no discount arithmetic of its own — a percentage recomputed on the
 * client is a second opinion nobody asked for, and it will eventually
 * disagree with the amount actually charged.
 */
export function OrderSummary({
  title,
  lines,
  total,
  emptyLabel,
  note,
  discount,
  children,
}: {
  title: string;
  lines: SummaryLine[];
  /** Basket total BEFORE any discount, priced from the catalog. */
  total: number;
  emptyLabel: string;
  note: string;
  discount: {
    open: boolean;
    setOpen: (v: boolean) => void;
    code: string;
    setCode: (v: string) => void;
    apply: () => void;
    remove: () => void;
    pending: boolean;
    applied: AppliedDiscount | null;
    error: string | null;
    errorText: (code: string) => string;
  };
  children?: ReactNode;
}) {
  const t = useTranslations("pages.tickets");
  const locale = useLocale();
  const money = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(v);

  const applied = discount.applied;
  // The server's `charged` wins over anything derivable here. It already
  // accounts for a discount larger than the basket, which clamps to zero.
  const payable = applied ? applied.charged : total;

  /**
   * Collapsed by default on a phone, always open on a wide screen.
   *
   * The card is pinned to the bottom of a small screen so the total stays in
   * view while someone picks tiers. Pinned AND fully expanded, it would cover
   * most of what it is summarising — so it behaves like the FAQ accordions:
   * the header is the toggle, and it carries the one number that has to be
   * legible whether or not anything is open.
   */
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-t-2xl border-t-2 border-black02 bg-offwhite lg:rounded-lg lg:border-2">
      {/*
        The header is the toggle on mobile and a plain heading from `lg`,
        where the body never collapses and there is nothing to press.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="order-summary-body"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left lg:cursor-default lg:px-6 lg:pb-0 lg:pt-6"
      >
        <h2 className="font-sans text-heading-m font-bold text-black02">
          {title}
        </h2>
        <span className="flex shrink-0 items-center gap-2 lg:hidden">
          {lines.length > 0 && (
            <span className="font-mono text-body-l font-bold text-black02">
              {money(applied ? applied.charged : total)} XAF
            </span>
          )}
          <CaretDown
            size={18}
            weight="bold"
            aria-hidden
            className={`transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <div
        id="order-summary-body"
        className={`${open ? "block" : "hidden"} px-5 pb-5 lg:block lg:px-6 lg:pb-6`}
      >
        {lines.length === 0 ? (
          <p className="mt-4 text-body-m text-black02/70">{emptyLabel}</p>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="min-w-0 text-body-m text-black02">
                    {line.label} × {line.quantity}
                    {line.sublabel && (
                      <span className="block text-caption text-black02/60">
                        {line.sublabel}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-body-m font-bold text-black02">
                    {money(line.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t-2 border-black02/15 pt-4">
              {applied && (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-body-m text-black02/75">
                      {t("subtotal")}
                    </span>
                    <span className="shrink-0 font-mono text-body-m text-black02/75">
                      {money(total)}
                    </span>
                  </div>

                  {/* The deduction, stated as a number rather than as a
                    reassurance. "Your code was applied" is not an answer to
                    "how much did it take off". */}
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-body-m font-bold text-black02">
                      <span className="inline-flex items-center gap-1.5">
                        <Tag size={14} weight="bold" aria-hidden />
                        {t("discountRow")}
                      </span>
                      <span className="font-mono text-caption uppercase tracking-wide text-black02/70">
                        {applied.code}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-body-m font-bold text-black02">
                      −{money(applied.amount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={discount.remove}
                    disabled={discount.pending}
                    className="mt-2 inline-flex items-center gap-1 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70 underline decoration-2 underline-offset-4 hover:text-black02 disabled:opacity-40"
                  >
                    <X size={12} weight="bold" aria-hidden />
                    {t("removeDiscount")}
                  </button>
                </>
              )}

              <div
                className={`flex items-baseline justify-between gap-4 ${
                  applied ? "mt-4 border-t-2 border-black02/15 pt-4" : ""
                }`}
              >
                <span className="font-sans text-body-l font-bold text-black02">
                  {applied ? t("totalToPay") : t("total")}
                </span>
                <span className="font-mono text-heading-m font-bold text-black02">
                  {money(payable)} XAF
                </span>
              </div>
            </div>

            {/* The server re-prices from the catalog at checkout, so this is an
              estimate until the order comes back with its quote. */}
            <p className="mt-3 text-caption text-black02/60">{note}</p>

            <div className="mt-5 border-t-2 border-black02/15 pt-4">
              {!discount.open && !applied ? (
                <button
                  type="button"
                  onClick={() => discount.setOpen(true)}
                  className="inline-flex items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
                >
                  <Tag size={14} weight="bold" aria-hidden />
                  {t("addDiscount")}
                </button>
              ) : applied ? (
                <p className="text-body-m text-black02/75">
                  {t("discountConfirmedAtPayment")}
                </p>
              ) : (
                <div>
                  <label
                    htmlFor="discount-code"
                    className="text-body-m font-bold text-black02"
                  >
                    {t("discountLabel")}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="discount-code"
                      value={discount.code}
                      onChange={(e) =>
                        discount.setCode(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        // Typing a code and pressing Enter is the obvious
                        // gesture; without this it submits the page instead.
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (discount.code.trim().length >= 3)
                            discount.apply();
                        }
                      }}
                      placeholder="GDG-2026"
                      maxLength={32}
                      disabled={discount.pending}
                      className="min-w-0 flex-1 rounded-lg border-2 border-black02 bg-offwhite px-3 py-2 font-mono text-body-m uppercase tracking-wide text-black02 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={discount.apply}
                      disabled={
                        discount.code.trim().length < 3 || discount.pending
                      }
                      className="inline-flex shrink-0 items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-4 py-2 font-sans text-body-m font-bold text-black02 disabled:opacity-40"
                    >
                      {discount.pending && (
                        <CircleNotch
                          size={14}
                          weight="bold"
                          aria-hidden
                          className="motion-safe:animate-spin"
                        />
                      )}
                      {discount.pending ? t("applying") : t("apply")}
                    </button>
                  </div>
                  {discount.error && (
                    <p
                      role="alert"
                      className="mt-2 text-body-m font-bold text-danger"
                    >
                      {discount.errorText(discount.error)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {children}
          </>
        )}
      </div>
    </div>
  );
}
