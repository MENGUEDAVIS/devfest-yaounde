import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import sessions from "@/data/sessions.json";
import type { Session } from "@/data/types";

const allSessions = sessions as Session[];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.schedule" });
  return {
    title: `${t("title")} · DevFest Yaoundé`,
    description: t("metaDesc"),
    openGraph: {
      title: `${t("title")} · DevFest Yaoundé`,
      description: t("metaDesc"),
    },
  };
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.schedule");

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
          {/* Same board as the Home preview, with filters and calendar on */}
          <ScheduleBoard sessions={allSessions} showFilters showCalendar />
        </div>
      </SectionContainer>
    </main>
  );
}
