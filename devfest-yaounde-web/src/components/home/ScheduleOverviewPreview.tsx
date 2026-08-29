"use client";

import {
  Coffee,
  ListBullets,
  MapPin,
  Microphone,
  Rocket,
  SquaresFour,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { sessionIn, sessionStyle } from "@/lib/motion";

/**
 * Illustrative placeholder structure only — there is no real schedule data
 * yet, and none of these times, tracks or rooms are confirmed. Shaped like
 * the eventual `Session` type so the full /schedule route can drop real data
 * in without reworking this component. See docs/guides/updating-home-page.md.
 */
const PLACEHOLDER_DAYS = [
  {
    day: 1,
    sessions: [
      {
        time: "10:00",
        kind: "talk" as const,
        track: { fr: "IA", en: "AI" },
        room: { fr: "Grande salle", en: "Main hall" },
        title: {
          fr: "Titre de session à venir",
          en: "Session title coming soon",
        },
        speaker: "Jane Doe",
      },
      {
        time: "12:30",
        kind: "break" as const,
        track: { fr: "Pause", en: "Break" },
        room: { fr: "Hall", en: "Foyer" },
        title: {
          fr: "Pause déjeuner et papotage",
          en: "Lunch and hallway chat",
        },
        speaker: "",
      },
      {
        time: "14:00",
        kind: "talk" as const,
        track: { fr: "Cloud", en: "Cloud" },
        room: { fr: "Salle B", en: "Room B" },
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
        time: "10:30",
        kind: "workshop" as const,
        track: { fr: "Atelier", en: "Workshop" },
        room: { fr: "Labo", en: "Lab" },
        title: {
          fr: "Encore un titre de session à venir",
          en: "Yet another session title coming soon",
        },
        speaker: "Amara Nwosu",
      },
      {
        time: "15:00",
        kind: "talk" as const,
        track: { fr: "Web", en: "Web" },
        room: { fr: "Grande salle", en: "Main hall" },
        title: {
          fr: "Et un dernier pour la route",
          en: "And one more for the road",
        },
        speaker: "Yusuf Mbarga",
      },
    ],
  },
];

const KIND_ICON = { talk: Microphone, workshop: Rocket, break: Coffee };

/** Slight per-card tilt so the timeline reads as pinned notes, not a table. */
const CARD_TILT = [-0.8, 0.6, -0.5, 0.9, -0.7];

/**
 * Schedule overview — PHASE7 §6 redesign.
 *
 * BEFORE: a flat stack of near-identical rows that read as a spreadsheet.
 *
 * AFTER, without losing anything accessible:
 *  - A pegboard/clipboard structure: a real timeline spine with punched time
 *    chips, session cards pinned along it at slight tilts, Phosphor duotone
 *    icons distinguishing talk / workshop / break.
 *  - Bold day tabs sized like real controls, not text links.
 *  - The structured <-> list toggle from PAGES.md §3 is KEPT and both views
 *    are first-class: list view is a plain semantic list, no tilts, no
 *    timeline spine — genuinely better for screen readers and quick lookup.
 *  - Session kind is conveyed by icon + text label, never colour alone
 *    (DESIGN.md §2.8).
 *  - Cards stagger in on day/view change and lift on hover.
 */
export function ScheduleOverviewPreview() {
  const t = useTranslations("home.schedule");
  const locale = useLocale() as "fr" | "en";
  const [activeDay, setActiveDay] = useState(0);
  const [view, setView] = useState<"structured" | "list">("structured");
  const day = PLACEHOLDER_DAYS[activeDay];

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

      {/* Controls: day tabs (left) + view toggle (right) */}
      <Reveal index={1}>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap gap-3">
            {PLACEHOLDER_DAYS.map((d, i) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDay(i)}
                aria-pressed={i === activeDay}
                className={`rounded-lg border-2 border-black02 px-6 py-3.5 font-sans text-body-l font-bold transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 ${
                  i === activeDay
                    ? "bg-yellow text-black02 shadow-[0_5px_0_0_var(--color-black02)]"
                    : "bg-transparent text-black02/70 hover:bg-yellow-pastel"
                }`}
              >
                {t("day", { day: d.day })}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span
              id="schedule-view-label"
              className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50"
            >
              {t("viewLabel")}
            </span>
            <div
              role="group"
              aria-labelledby="schedule-view-label"
              className="flex overflow-hidden rounded-pill border-2 border-black02"
            >
              {(
                [
                  ["structured", SquaresFour, t("viewStructured")],
                  ["list", ListBullets, t("viewList")],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={`flex items-center gap-2 px-4 py-2.5 font-mono text-mono-tag font-bold uppercase tracking-wide transition-colors duration-200 ${
                    view === key
                      ? "bg-black02 text-offwhite"
                      : "bg-transparent text-black02 hover:bg-yellow-pastel"
                  }`}
                >
                  <Icon size={16} weight="bold" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/*
        key forces a remount on day/view change so the stagger animation
        replays — that "satisfying view-toggle transition" is the point.
      */}
      <div key={`${activeDay}-${view}`} className="mt-12">
        {view === "structured" ? (
          /* ---- Timeline spine with pinned session cards ---- */
          <ol className="relative flex flex-col gap-6 border-l-4 border-dashed border-black02/25 pl-6 sm:pl-10">
            {day.sessions.map((s, i) => {
              const Icon = KIND_ICON[s.kind];
              return (
                <li
                  key={`${day.day}-${i}`}
                  className={`${sessionIn} relative`}
                  style={sessionStyle(i, CARD_TILT[i % CARD_TILT.length])}
                >
                  {/* Punched time chip sitting on the spine */}
                  <span className="absolute -left-6 top-6 -translate-x-1/2 rounded-pill border-2 border-black02 bg-yellow px-3 py-1 font-mono text-mono-tag font-bold text-black02 sm:-left-10">
                    {s.time}
                  </span>

                  <div className="ml-6 rounded-lg border-2 border-black02 bg-yellow-pastel px-6 py-6 shadow-[0_5px_0_0_var(--color-black02)] transition-transform duration-200 ease-out-devfest hover:-translate-y-1 sm:ml-8 sm:px-8">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex items-center gap-1.5 rounded-pill border-2 border-black02 bg-offwhite px-3 py-1 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
                        <Icon size={14} weight="duotone" />
                        {s.track[locale]}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-caption text-black02/60">
                        <MapPin size={14} weight="bold" aria-hidden />
                        <span className="sr-only">{t("room")}: </span>
                        {s.room[locale]}
                      </span>
                    </div>
                    <p className="mt-4 font-sans text-heading-l font-bold leading-tight text-black02">
                      {s.title[locale]}
                    </p>
                    {s.speaker && (
                      <p className="mt-2 font-mono text-caption text-black02/70">
                        {s.speaker}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          /* ---- List view: flat, scannable, no decoration ---- */
          <ul className="flex flex-col divide-y-2 divide-black02/10 rounded-lg border-2 border-black02 bg-yellow-pastel">
            {day.sessions.map((s, i) => {
              const Icon = KIND_ICON[s.kind];
              return (
                <li
                  key={`${day.day}-${i}`}
                  className={`${sessionIn} flex flex-col gap-2 px-6 py-5 transition-colors duration-200 hover:bg-yellow/30 sm:flex-row sm:items-baseline sm:gap-6 sm:px-8`}
                  style={sessionStyle(i)}
                >
                  <span className="shrink-0 font-mono text-mono-tag font-bold text-black02">
                    {s.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-heading-m font-bold text-black02">
                      {s.title[locale]}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-black02/70">
                      <span className="flex items-center gap-1.5">
                        <Icon size={14} weight="bold" aria-hidden />
                        {s.track[locale]}
                      </span>
                      <span>
                        <span className="sr-only">{t("room")}: </span>
                        {s.room[locale]}
                      </span>
                      {s.speaker && <span>{s.speaker}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
