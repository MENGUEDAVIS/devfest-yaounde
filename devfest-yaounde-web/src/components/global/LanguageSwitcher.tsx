"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const nextLocale = locale === "fr" ? "en" : "fr";

  return (
    <Link
      href={pathname}
      locale={nextLocale}
      aria-label={
        nextLocale === "en" ? t("switchToEnglish") : t("switchToFrench")
      }
      className="rounded-pill border-2 border-black02 px-3.5 py-2.5 font-mono text-caption font-bold text-black02 transition-[background-color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-halftone active:translate-y-0.5"
    >
      {nextLocale.toUpperCase()}
    </Link>
  );
}
