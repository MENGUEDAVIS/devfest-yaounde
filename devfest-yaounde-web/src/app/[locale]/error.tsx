"use client";

import { ArrowClockwise, House, Plugs } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

/**
 * The error boundary for everything under a locale (PHASE15 §6).
 *
 * Two ways out, because they fail differently: "try again" re-runs the render
 * that threw, which is the right move for something transient, and "home" is
 * for when it is not.
 *
 * `digest` is shown when there is one. It is the only handle on a server
 * error — the message itself is deliberately withheld from the browser by
 * Next, so a person reporting the problem has nothing else to quote.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.crash");
  const locale = useLocale();

  useEffect(() => {
    // No error service is wired up yet, so the console is the only record.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="4xl">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
            <Plugs size={16} weight="bold" aria-hidden />
            500
          </span>
          <h1 className="font-sans text-display-l font-bold leading-[0.95] text-black02">
            <ScrambleText text={t("title")} />
          </h1>
          <p className="max-w-xl text-body-l text-black02/80">{t("body")}</p>

          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
            >
              <ArrowClockwise size={18} weight="bold" aria-hidden />
              {t("retry")}
            </button>
            <Link
              href="/"
              locale={locale as "fr" | "en"}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-6 py-3 font-sans text-body-m font-bold text-black02 hover:bg-halftone"
            >
              <House size={18} weight="bold" aria-hidden />
              {t("home")}
            </Link>
          </div>

          {error.digest && (
            <p className="mt-2 font-mono text-caption text-black02/60">
              {t("reference")}{" "}
              <span className="font-bold text-black02">{error.digest}</span>
            </p>
          )}
        </div>
      </SectionContainer>
    </main>
  );
}
