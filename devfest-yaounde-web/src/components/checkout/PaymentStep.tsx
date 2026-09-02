"use client";

import { DeviceMobile } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { signInWithGoogle } from "@/lib/use-session";
import type { Profile } from "@/lib/use-session";

/**
 * The payment step, shared by tickets and shop.
 *
 * Two things here are load-bearing rather than decorative:
 *
 * 1. **Mobile Money only, with NO card control rendered at all.** The
 *    integration does not support cards, and a disabled "card" button reads
 *    as a bug on someone's phone rather than a decision (GAPS.md G1).
 *
 * 2. **The refund acknowledgment gates the pay button.** It is stated in
 *    body-sized text on the page someone is about to pay from — not a link,
 *    not a collapsed block, not small print. Money is involved; burying it
 *    would be a dark pattern. The gate lives here, in one place, so both
 *    checkouts inherit the version that was actually verified to block.
 */
export function PaymentStep({
  phone,
  setPhone,
  acceptedTerms,
  setAcceptedTerms,
  profile,
  sessionLoading,
  signInNext,
  extra,
}: {
  phone: string;
  setPhone: (v: string) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  profile: Profile | null;
  sessionLoading: boolean;
  signInNext: string;
  /** Anything the surface adds — e.g. the shop's fulfilment choice. */
  extra?: ReactNode;
}) {
  const t = useTranslations("pages.tickets");
  const locale = useLocale();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="flex items-start gap-3 rounded-lg border-2 border-black02 bg-offwhite p-5">
        <DeviceMobile
          size={22}
          weight="bold"
          className="mt-0.5 shrink-0 text-black02"
        />
        <div>
          <p className="text-body-m font-bold text-black02">{t("momoTitle")}</p>
          <p className="mt-1 text-body-m text-black02/75">{t("momoBody")}</p>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-body-m font-bold text-black02">
          {t("phoneLabel")}
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="237690000000"
          inputMode="numeric"
          className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-mono text-body-m text-black02"
        />
        <span className="text-caption text-black02/60">{t("phoneHint")}</span>
      </label>

      {extra}

      <div className="rounded-lg border-2 border-black02 bg-pastel p-5">
        <p className="font-sans text-body-l font-bold text-black02">
          {t("refundTitle")}
        </p>
        <p className="mt-2 text-body-m text-black02/80">{t("refundBody")}</p>
        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-sm border-2 border-black02 accent-[var(--color-primary)]"
          />
          <span className="text-body-m font-bold text-black02">
            {t("refundAck")}
          </span>
        </label>
      </div>

      {!sessionLoading && !profile && (
        <div className="rounded-lg border-2 border-black02 bg-offwhite p-5">
          <p className="text-body-m font-bold text-black02">
            {t("signInRequired")}
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle(locale, signInNext)}
            className="mt-4 inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
          >
            {t("continueWithGoogle")}
          </button>
        </div>
      )}
    </div>
  );
}
