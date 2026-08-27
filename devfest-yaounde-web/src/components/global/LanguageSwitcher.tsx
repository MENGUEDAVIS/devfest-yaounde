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
      className="rounded-pill border border-black02/15 px-2.5 py-1 text-caption font-mono font-bold text-black02 transition-colors hover:bg-black02/5"
    >
      {nextLocale.toUpperCase()}
    </Link>
  );
}
