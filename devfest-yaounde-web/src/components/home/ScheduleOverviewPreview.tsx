"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";

/**
 * Illustrative only — no real schedule/session data exists yet (that's a
 * later phase). Day count (2) and these session titles are placeholder
 * structure to show the day-tab pattern, not confirmed facts. See
 * docs/guides/updating-home-page.md.
 */
const PLACEHOLDER_DAYS = [
  {
    day: 1,
    sessions: [
      {
        title: {
          fr: "Titre de session à venir",
          en: "Session title coming soon",
        },
        speaker: "Jane Doe",
      },
      {
        title: {
          fr: "Un autre titre de session à venir",
          en: "Another session title coming soon",
        },
        speaker: "Kwame Asante",
      },
    ],
  },
  {
    day: 2,
    sessions: [
      {
        title: {
          fr: "Encore un titre de session à venir",
          en: "Yet another session title coming soon",
        },
        speaker: "Amara Nwosu",
      },
    ],
  },
];

export function ScheduleOverviewPreview() {
  const t = useTranslations("home.schedule");
  const locale = useLocale() as "fr" | "en";
  const [activeDay, setActiveDay] = useState(0);
  const day = PLACEHOLDER_DAYS[activeDay];

  return (
    <SectionContainer background="offwhite" maxWidth="5xl">
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

      <Reveal index={1}>
        <div className="mt-12 flex gap-3">
          {PLACEHOLDER_DAYS.map((d, i) => (
            <button
              key={d.day}
              type="button"
              onClick={() => setActiveDay(i)}
              aria-pressed={i === activeDay}
              className={`rounded-pill border-2 border-black02 px-6 py-3 font-sans text-body-m font-bold transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 ${
                i === activeDay
                  ? "bg-yellow text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
                  : "bg-transparent text-black02 hover:bg-yellow-pastel"
              }`}
            >
              {t("day", { day: d.day })}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-10 flex flex-col gap-5">
        {day.sessions.map((session, i) => (
          <Reveal key={`${day.day}-${i}`} index={i}>
            <div className="rounded-lg border-2 border-black02 bg-yellow-pastel px-7 py-6 transition-transform duration-200 ease-out-devfest hover:-translate-y-1">
              <p className="font-sans text-heading-m font-bold text-black02">
                {session.title[locale]}
              </p>
              <p className="mt-2 font-mono text-caption text-black02/70">
                {session.speaker}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Button
        tone="black02"
        variant="secondary"
        href="/schedule"
        size="md"
        className="mt-10 sm:hidden"
      >
        {t("cta")}
      </Button>
    </SectionContainer>
  );
}
