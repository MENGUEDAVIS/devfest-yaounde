import { getTranslations } from "next-intl/server";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import sessions from "@/data/sessions.json";
import type { Session } from "@/data/types";

const allSessions = sessions as Session[];

/**
 * Home schedule preview. The board itself (day tabs, view toggle, expandable
 * session cards) lives in `@/components/schedule/ScheduleBoard` and is shared
 * verbatim with the full /schedule route — there is no second, divergent
 * implementation. Filters are the full route's job, so they're off here.
 */
export async function ScheduleOverviewPreview() {
  const t = await getTranslations("home.schedule");

  return (
    <SectionContainer background="offwhite" maxWidth="6xl">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-sans text-display-xl font-bold text-black02">
            {t("title")}
          </h2>
          <Button
            tone="black02"
            variant="secondary"
            href="/schedule"
            size="md"
            className="hidden sm:inline-flex"
          >
            {t("cta")}
          </Button>
        </div>
      </Reveal>

      <div className="mt-12">
        <ScheduleBoard sessions={allSessions} />
      </div>

      <Button
        tone="black02"
        variant="secondary"
        href="/schedule"
        size="md"
        className="mt-12 sm:hidden"
      >
        {t("cta")}
      </Button>
    </SectionContainer>
  );
}
