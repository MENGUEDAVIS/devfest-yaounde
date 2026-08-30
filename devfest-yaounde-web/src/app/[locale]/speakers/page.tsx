import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { SpeakerBrowser } from "@/components/speakers/SpeakerBrowser";
import { SectionContainer } from "@/components/ui/SectionContainer";
import speakers from "@/data/speakers.json";
import type { Speaker } from "@/data/types";

const allSpeakers = speakers as Speaker[];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.speakers" });
  return {
    title: `${t("title")} · DevFest Yaoundé`,
    description: t("metaDesc"),
    openGraph: {
      title: `${t("title")} · DevFest Yaoundé`,
      description: t("metaDesc"),
    },
  };
}

export default async function SpeakersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.speakers");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="7xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>

        <div className="mt-16">
          {/*
            SpeakerGrid reads `?spk=` via useSearchParams, which needs a
            Suspense boundary so the rest of the page can still be
            statically prerendered.
          */}
          <Suspense fallback={null}>
            <SpeakerBrowser speakers={allSpeakers} />
          </Suspense>
        </div>
      </SectionContainer>
    </main>
  );
}
