import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DpGenerator } from "@/components/dp/DpGenerator";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.dpGenerator" });
  return pageMetadata({
    locale,
    path: "/dp-generator",
    title: t("title"),
    description: t("metaDesc"),
  });
}

/**
 * `/{locale}/dp-generator` — PAGES.md §9.
 *
 * The page is a shell: a heading, and one client component that does the
 * whole job in the browser. There is no server work to do, because there is
 * no server side to this feature — the photo is composited and downloaded
 * locally and never uploaded (ADR 0015).
 *
 * That also means it is genuinely standalone. No session is read, no order is
 * looked up, nothing is fetched. It shares the brand, the theme and the
 * cursor with the rest of the site and depends on none of its backend.
 */
export default async function DpGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.dpGenerator");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>

        <div className="mt-16">
          <DpGenerator />
        </div>
      </SectionContainer>
    </main>
  );
}
