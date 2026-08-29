"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SpeakerCard } from "./SpeakerCard";
import type { Speaker } from "@/data/types";

/** Alternating card tilt so the grid doesn't read as a rigid matrix. */
const TILT = [-2, 1.5, -1, 2];

export interface SpeakerGridProps {
  speakers: Speaker[];
}

/**
 * Full speakers grid — PAGES.md §4.1.
 *
 * Uses the SAME `SpeakerCard` swipe-up interaction as the Home preview
 * rather than the modal originally specced in §4.2, so there is one pattern
 * and one component across both surfaces
 * (see docs/decisions/0009-speaker-interaction.md).
 *
 * Shareability (§4.2) is kept via a `?spk=<id>` query param: opening a card
 * pushes the id into the URL with `history.replaceState`, so the link can be
 * copied without triggering a Next.js navigation or a scroll jump. Landing
 * on such a URL opens that speaker.
 *
 * Card sizing is fixed regardless of bio length — the bio lives in the
 * swipe-up panel, never on the card face.
 */
export function SpeakerGrid({ speakers }: SpeakerGridProps) {
  const t = useTranslations("pages.speakers");
  const locale = useLocale() as "fr" | "en";
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  /**
   * Deep link (`?spk=`) resolved in a lazy useState initializer rather than
   * an effect: it runs exactly once per mount, keeps the read out of an
   * effect body (which the React Compiler rules reject), and avoids a
   * render-then-correct flash. Safe against hydration mismatch because
   * `useSearchParams` puts this subtree behind Suspense, so the server
   * prerenders the fallback and this only ever renders on the client.
   */
  const [openId, setOpenId] = useState<string | null>(() => {
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
    .filter((s) => (day ? s.day === day : true));

  function toggleCard(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    // replaceState keeps the URL shareable without a navigation or scroll jump
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("spk", next);
    else url.searchParams.delete("spk");
    window.history.replaceState(null, "", url);
  }

  const chip = (active: boolean) =>
    `rounded-pill border-2 border-black02 px-4 py-2 font-mono text-mono-tag font-bold uppercase tracking-wide transition-[transform,background-color] duration-200 ease-bouncy hover:-translate-y-0.5 motion-reduce:transform-none ${
      active
        ? "bg-yellow text-black02"
        : "bg-transparent text-black02/70 hover:bg-yellow-pastel"
    }`;

  const filtered = query.trim() !== "" || track !== null || day !== null;

  return (
    <>
      <Reveal>
        <div className="flex flex-col gap-6">
          {/* Search */}
          <div className="relative max-w-md">
            <MagnifyingGlass
              size={20}
              weight="bold"
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black02/50"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("searchLabel")}
              className="w-full rounded-pill border-2 border-black02 bg-offwhite py-3 pl-12 pr-4 text-body-m text-black02 placeholder:text-black02/45"
            />
          </div>

          {/* Track filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTrack(null)}
              aria-pressed={track === null}
              className={chip(track === null)}
            >
              {t("allTracks")}
            </button>
            {tracks.map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setTrack(tr)}
                aria-pressed={track === tr}
                className={chip(track === tr)}
              >
                {tr}
              </button>
            ))}
          </div>

          {/* Day filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDay(null)}
              aria-pressed={day === null}
              className={chip(day === null)}
            >
              {t("allDays")}
            </button>
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={day === d}
                className={chip(day === d)}
              >
                {t("day", { day: d })}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <p
              aria-live="polite"
              className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50"
            >
              {t("results", { count: visible.length })}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setTrack(null);
                  setDay(null);
                }}
                className="inline-flex items-center gap-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
              >
                <X size={14} weight="bold" aria-hidden />
                {t("clear")}
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {visible.length === 0 ? (
        <p className="mt-14 rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center text-body-l text-black02/70">
          {t("noResults")}
        </p>
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((s, i) => (
            <Reveal key={s.id} index={i % 4}>
              <SpeakerCard
                speaker={s}
                open={openId === s.id}
                onToggle={() => toggleCard(s.id)}
                tilt={TILT[i % TILT.length]}
              />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
