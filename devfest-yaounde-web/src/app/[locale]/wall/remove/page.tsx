import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { WallRemoveList } from "@/components/wall/WallRemoveList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.wallRemove" });
  return pageMetadata({
    locale,
    path: "/wall/remove",
    title: t("title"),
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
  const t = await getTranslations("pages.wallRemove");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="3xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 text-body-l text-black02/80">{t("lead")}</p>
        <div className="mt-12">
          <WallRemoveList />
        </div>
      </SectionContainer>
    </main>
  );
}
