import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.wallTerms" });
  return pageMetadata({
    locale,
    path: "/wall/terms",
    title: t("title"),
    description: t("metaDesc"),
  });
}

export default async function WallTermsPage({
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
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 text-body-l text-black02/80">{t("lead")}</p>

        <section className="mt-12">
          <h2 className="font-sans text-heading-m font-bold text-black02">
            {t("storedTitle")}
          </h2>
          <p className="mt-3 text-body-m text-black02/80">{t("storedBody")}</p>
        </section>
        <section className="mt-8">
          <h2 className="font-sans text-heading-m font-bold text-black02">
            {t("whereTitle")}
          </h2>
          <p className="mt-3 text-body-m text-black02/80">{t("whereBody")}</p>
        </section>
        <section className="mt-8">
          <h2 className="font-sans text-heading-m font-bold text-black02">
            {t("howTitle")}
          </h2>
          <p className="mt-3 text-body-m text-black02/80">{t("howBody")}</p>
        </section>
        <p className="mt-8 text-body-m font-bold text-black02">{t("children")}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/wall/remove"
            className="rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02"
          >
            {t("removeCta")}
          </Link>
          <Link
            href="/wall"
            className="rounded-pill border-2 border-black02 px-6 py-3 font-sans text-body-m font-bold text-black02"
          >
            {t("wallCta")}
          </Link>
        </div>
      </SectionContainer>
    </main>
  );
}
