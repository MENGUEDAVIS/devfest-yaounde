"use client";

import { Tag } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

export interface SummaryLine {
  id: string;
  label: string;
  sublabel?: string;
  quantity: number;
  amount: number;
}

/**
 * The sticky "Your order" card — shared by tickets and shop.
 *
 * The DISCOUNT FIELD LIVES HERE, not in a step of its own. Most people do not
 * have a code, and a whole step asking about something most people skip is a
 * step that mostly gets clicked through.
 *
 * There is deliberately no pre-validation call behind "Apply": an endpoint
 * that says whether a code is real would be a free oracle for guessing codes
 * (GAPS.md G4). Apply stages the code, and the server's verdict arrives with
 * the order — which is exactly what the copy says, rather than implying the
 * code has been checked.
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
  total: number;
  emptyLabel: string;
  note: string;
  discount: {
    open: boolean;
    setOpen: (v: boolean) => void;
    code: string;
    setCode: (v: string) => void;
    applied: boolean;
    apply: () => void;
    error: string | null;
    errorText: (code: string) => string;
  };
  children?: ReactNode;
}) {
  const t = useTranslations("pages.tickets");
  const locale = useLocale();
  const money = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(v);

  return (
    <div className="rounded-lg border-2 border-black02 bg-offwhite p-6">
      <h2 className="font-sans text-heading-m font-bold text-black02">
        {title}
      </h2>

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

          <div className="mt-5 flex items-baseline justify-between gap-4 border-t-2 border-black02/15 pt-4">
            <span className="font-sans text-body-l font-bold text-black02">
              {t("total")}
            </span>
            <span className="font-mono text-heading-m font-bold text-black02">
              {money(total)} XAF
            </span>
          </div>
          {/* The server recomputes every total from the catalog, so this is an
              estimate until the order comes back with its quote. */}
          <p className="mt-3 text-caption text-black02/60">{note}</p>

          <div className="mt-5 border-t-2 border-black02/15 pt-4">
            {!discount.open ? (
              <button
                type="button"
                onClick={() => discount.setOpen(true)}
                className="inline-flex items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
              >
                <Tag size={14} weight="bold" aria-hidden />
                {t("addDiscount")}
              </button>
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
                    placeholder="GDG-2026"
                    maxLength={32}
                    className="min-w-0 flex-1 rounded-lg border-2 border-black02 bg-offwhite px-3 py-2 font-mono text-body-m uppercase tracking-wide text-black02"
                  />
                  <button
                    type="button"
                    onClick={discount.apply}
                    disabled={discount.code.trim().length < 3}
                    className="shrink-0 rounded-pill border-2 border-black02 bg-primary px-4 py-2 font-sans text-body-m font-bold text-black02 disabled:opacity-40"
                  >
                    {t("apply")}
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
                {discount.applied && !discount.error && (
                  <p className="mt-2 text-body-m text-black02/75">
                    {t("discountStaged")}
                  </p>
                )}
              </div>
            )}
          </div>

          {children}
        </>
      )}
    </div>
  );
}
