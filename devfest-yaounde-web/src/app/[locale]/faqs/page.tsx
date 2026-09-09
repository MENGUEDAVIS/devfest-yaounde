import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqBrowser } from "@/components/faqs/FaqBrowser";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { getFaqs } from "@/lib/content/store";
import { loadSettings } from "@/lib/content/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.faqs" });
  return pageMetadata({
    locale,
    path: "/faqs",
    title: t("title"),
    description: t("metaDesc"),
  });
}

export default async function FaqsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.faqs");
  const [allFaqs, settings] = await Promise.all([getFaqs(), loadSettings()]);

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="4xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>

        <div className="mt-16">
          <FaqBrowser
            faqs={allFaqs}
            participationTermsUrl={settings.legal.participationTermsUrl}
          />
        </div>
      </SectionContainer>
    </main>
  );
}
