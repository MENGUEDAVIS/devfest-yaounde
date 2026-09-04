import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CHAPTER_EMAIL } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.wallTerms" });
  return pageMetadata({
    locale,
    path: "/wall/remove",
    title: t("howTitle"),
    description: t("metaDesc"),
    index: false,
  });
}

export default async function WallRemovePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.wallTerms");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="3xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("howTitle")} />
        </h1>
        <p className="mt-6 text-body-l text-black02/80">{t("howBody")}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={`mailto:${CHAPTER_EMAIL}`}
            className="rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02"
          >
            {CHAPTER_EMAIL}
          </a>
          <Link
            href="/wall/terms"
            className="rounded-pill border-2 border-black02 px-6 py-3 font-sans text-body-m font-bold text-black02"
          >
            {t("wallCta")}
          </Link>
        </div>
      </SectionContainer>
    </main>
  );
}
