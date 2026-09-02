"use client";

import { Coffee, House, MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

/**
 * 404, inside a locale (PHASE15 §6).
 *
 * A CLIENT component on purpose. `not-found.tsx` receives no `params`, so a
 * server component here would have no locale to translate against; reading it
 * from the provider the layout already renders is the one way to get a page
 * that is genuinely in the visitor's language rather than always in French.
 *
 * It offers the four places people are actually trying to reach when a URL
 * misses — a dead end with only "go home" on it makes someone start over.
 */
export default function NotFound() {
  const t = useTranslations("errors.notFound");
  const locale = useLocale();

  const links = [
    { href: "/", label: t("links.home") },
    { href: "/schedule", label: t("links.schedule") },
    { href: "/tickets", label: t("links.tickets") },
    { href: "/shop", label: t("links.shop") },
  ];

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="4xl">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
            <Coffee size={16} weight="bold" aria-hidden />
            404
          </span>
          <h1 className="font-sans text-display-l font-bold leading-[0.95] text-black02">
            <ScrambleText text={t("title")} />
          </h1>
          <p className="max-w-xl text-body-l text-black02/80">{t("body")}</p>

          <nav aria-label={t("linksLabel")} className="mt-4">
            <ul className="flex flex-wrap gap-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    locale={locale as "fr" | "en"}
                    className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
                  >
                    {link.href === "/" ? (
                      <House size={18} weight="bold" aria-hidden />
                    ) : (
                      <MagnifyingGlass size={18} weight="bold" aria-hidden />
                    )}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SectionContainer>
    </main>
  );
}
