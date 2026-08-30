"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PersonSlider } from "@/components/people/PersonSlider";
import { FilterGroup } from "@/components/ui/FilterGroup";
import { FilterLayout } from "@/components/ui/FilterLayout";
import { Reveal } from "@/components/ui/Reveal";
import { ViewToggle, type PersonView } from "@/components/ui/ViewToggle";
import { SpeakerCard } from "./SpeakerCard";
import type { Speaker } from "@/data/types";

const TILT = [-2, 1.5, -1, 2];

/**
 * /speakers — filters + dual views (PHASE9 §2/§3/§4).
 *
 * Search and both filter dimensions live in the shared `FilterLayout`
 * (sticky sidebar on desktop, bottom drawer on mobile), grouped under
 * labelled `FilterGroup`s rather than a flat pile of chips.
 *
 * Grid and Slider filter the SAME derived list, so switching view never
 * changes what's in scope. The focused person is preserved across the
 * switch too: the grid's open card and the slider's index are kept in sync
 * through one `focusedId`, so you land on the person you were looking at.
 */
export function SpeakerBrowser({ speakers }: { speakers: Speaker[] }) {
  const t = useTranslations("pages.speakers");
  const locale = useLocale() as "fr" | "en";
  const searchParams = useSearchParams();

  const [view, setView] = useState<PersonView>("grid");
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  /** Deep link resolved once, in a lazy initializer (never an effect). */
  const [focusedId, setFocusedId] = useState<string | null>(() => {
    const spk = searchParams.get("spk");
    return spk && speakers.some((s) => s.id === spk) ? spk : null;
  });

  const tracks = useMemo(
    () => [...new Set(speakers.map((s) => s.track[locale]))].sort(),
    [speakers, locale],
  );
  const days = useMemo(
    () => [...new Set(speakers.map((s) => s.day))].sort((a, b) => a - b),
    [speakers],
  );

  const visible = speakers
    .filter((s) =>
      query.trim()
        ? s.name.toLowerCase().includes(query.trim().toLowerCase())
        : true,
    )
    .filter((s) => (track ? s.track[locale] === track : true))
    .filter((s) => (day ? String(s.day) === day : true));

  const activeCount = (query.trim() ? 1 : 0) + (track ? 1 : 0) + (day ? 1 : 0);

  function clearAll() {
    setQuery("");
    setTrack(null);
    setDay(null);
  }

  /** Keep the URL shareable without a navigation or scroll jump. */
  function writeUrl(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("spk", id);
    else url.searchParams.delete("spk");
    window.history.replaceState(null, "", url);
  }

  function toggleCard(id: string) {
    const next = focusedId === id ? null : id;
    setFocusedId(next);
    writeUrl(next);
  }

  // Slider index derives from the shared focusedId, so the view switch keeps
  // your place. Falls back to 0 when the focused person is filtered out.
  const sliderIndex = Math.max(
    0,
    visible.findIndex((s) => s.id === focusedId),
  );

  const filters = (
    <>
      <div className="relative">
        <MagnifyingGlass
          size={18}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black02/50"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("searchLabel")}
          className="w-full rounded-pill border-2 border-black02 bg-offwhite py-2.5 pl-11 pr-4 text-body-m text-black02 placeholder:text-black02/45"
        />
      </div>

      <FilterGroup
        label={t("trackLabel")}
        selected={track}
        onSelect={setTrack}
        options={[
          { value: null, label: t("allTracks") },
          ...tracks.map((tr) => ({ value: tr, label: tr })),
        ]}
      />

      <FilterGroup
        label={t("dayLabel")}
        selected={day}
        onSelect={setDay}
        options={[
          { value: null, label: t("allDays") },
          ...days.map((d) => ({
            value: String(d),
            label: t("day", { day: d }),
          })),
        ]}
      />
    </>
  );

  return (
    <FilterLayout
      filters={filters}
      activeCount={activeCount}
      onClearAll={clearAll}
      toolbar={<ViewToggle view={view} onChange={setView} />}
    >
      <p
        aria-live="polite"
        className="mb-8 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50"
      >
        {t("results", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center text-body-l text-black02/70">
          {t("noResults")}
        </p>
      ) : view === "slider" ? (
        <PersonSlider
          people={visible}
          index={sliderIndex}
          onIndexChange={(i) => {
            const next = visible[i]?.id ?? null;
            setFocusedId(next);
            writeUrl(next);
          }}
          emptyLabel={t("noResults")}
        />
      ) : (
        /*
         * 4 columns at xl — the floating filter rail takes no width from the
         * grid (PHASE10 §1). `items-start` matters: without it every card in
         * a row stretches to match an expanded neighbour.
         */
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((s, i) => (
            <Reveal
              key={s.id}
              index={i % 3}
              /* The Reveal IS the grid item, so the expanded card's column
                 span has to live here, not on the card. */
              className={focusedId === s.id ? "sm:col-span-2" : ""}
            >
              <SpeakerCard
                speaker={s}
                open={focusedId === s.id}
                onToggle={() => toggleCard(s.id)}
                tilt={TILT[i % TILT.length]}
                expandInPlace
              />
            </Reveal>
          ))}
        </div>
      )}
    </FilterLayout>
  );
}
