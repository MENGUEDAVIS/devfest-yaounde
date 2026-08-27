"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionContainer } from "@/components/ui/SectionContainer";

/**
 * Illustrative only — no real schedule/session data exists yet (that's
 * Phase 4's job). Day count (2) and these session titles are placeholder
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
    <SectionContainer background="offwhite" maxWidth="4xl">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-display-l font-bold text-black02">{t("title")}</h2>
        <Button
          tone="blue"
          variant="secondary"
          href="/schedule"
          className="hidden sm:inline-flex"
        >
          {t("cta")}
        </Button>
      </div>

      <div className="mt-6 flex gap-2">
        {PLACEHOLDER_DAYS.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setActiveDay(i)}
            className={`rounded-pill px-4 py-2 text-body-m font-bold transition-colors ${
              i === activeDay
                ? "bg-blue text-offwhite"
                : "bg-black02/5 text-black02 hover:bg-black02/10"
            }`}
          >
            {t("day", { day: d.day })}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {day.sessions.map((session, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-md bg-blue-pastel px-5 py-4"
          >
            <div>
              <p className="text-body-m font-bold text-black02">
                {session.title[locale]}
              </p>
              <p className="text-caption font-mono text-black02/60">
                {session.speaker}
              </p>
            </div>
            <Badge tone="blue">{t("day", { day: day.day })}</Badge>
          </div>
        ))}
      </div>

      <Button
        tone="blue"
        variant="secondary"
        href="/schedule"
        className="mt-6 sm:hidden"
      >
        {t("cta")}
      </Button>
    </SectionContainer>
  );
}
