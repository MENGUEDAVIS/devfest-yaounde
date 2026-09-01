"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { PersonSlider } from "@/components/people/PersonSlider";
import { FilterGroup } from "@/components/ui/FilterGroup";
import { FilterLayout } from "@/components/ui/FilterLayout";
import { Reveal } from "@/components/ui/Reveal";
import { ViewToggle, type PersonView } from "@/components/ui/ViewToggle";
import { chooseSide, type PopoverSide } from "@/lib/popover-anchor";
import { TeamCard } from "./TeamCard";
import type { TeamMember } from "@/data/types";

const TILT = [-2, 1.5, -1, 2];

/**
 * /team — filters + dual views, organised by contribution (PHASE9 §0/§2/§3/§4).
 *
 * The team is described and filtered by `contribution` (Organising, Design,
 * Logistics, Sponsoring, Ushering, Programme) rather than an invented
 * sub-team org chart, which was never confirmed. See
 * docs/decisions/0010-team-grouping.md — the "structure unknown" note that
 * used to sit on this page is retired as a result.
 *
 * PHASE11 §10: the grid is a FLAT grid again. Contribution is still the
 * filter axis and still stamped on every card, but it no longer breaks the
 * grid into visual groups — with a team this size that produced mostly
 * one-person sections, each costing a heading and a band of whitespace to
 * say what the card underneath already said.
 *
 * Alumni are excluded from the filtered set and rendered by the page in
 * their own section, so filtering never silently hides the past-organiser
 * story.
 */
export function TeamBrowser({ members }: { members: TeamMember[] }) {
  const t = useTranslations("pages.team");
  const tf = useTranslations("common.filters");
  const locale = useLocale() as "fr" | "en";

  const [view, setView] = useState<PersonView>("grid");
  const [query, setQuery] = useState("");
  const [contribution, setContribution] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  /** Popover anchor — measured at click time, see popover-anchor.ts. */
  const [side, setSide] = useState<PopoverSide>("right");

  const contributions = useMemo(
    () => [...new Set(members.map((m) => m.contribution[locale]))].sort(),
    [members, locale],
  );

  const visible = members
    .filter((m) =>
      query.trim()
        ? m.name.toLowerCase().includes(query.trim().toLowerCase())
        : true,
    )
    .filter((m) =>
      contribution ? m.contribution[locale] === contribution : true,
    );

  const activeCount = (query.trim() ? 1 : 0) + (contribution ? 1 : 0);

  /** Accordion: one open at a time, by construction (single `focusedId`). */
  function toggleCard(id: string, card: Element | null) {
    const next = focusedId === id ? null : id;
    if (next) setSide(chooseSide(card));
    setFocusedId(next);
  }

  useEffect(() => {
    if (!focusedId || view !== "grid") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFocusedId(null);
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element;
      /*
       * The mobile detail sheet is PORTALLED to <body>, so it is not inside
       * `.speaker-card.is-open` — without the second test, every touch
       * *inside* the sheet counted as an outside click and dismissed it the
       * moment it opened. The sheet handles its own scrim tap and Escape.
       */
      if (target.closest('[role="dialog"]')) return;
      if (!target.closest(".speaker-card.is-open")) setFocusedId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [focusedId, view]);

  const sliderIndex = Math.max(
    0,
    visible.findIndex((m) => m.id === focusedId),
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
        label={t("contribution")}
        selected={contribution}
        onSelect={setContribution}
        options={[
          { value: null, label: t("allContributions") },
          ...contributions.map((c) => ({ value: c, label: c })),
        ]}
      />
    </>
  );

  return (
    <FilterLayout
      filters={filters}
      activeCount={activeCount}
      onClearAll={() => {
        setQuery("");
        setContribution(null);
      }}
      toolbar={<ViewToggle view={view} onChange={setView} />}
    >
      <p
        aria-live="polite"
        className="mb-8 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50"
      >
        {t("groupBy")}
      </p>

      {/*
        PHASE13 §2: the slider is a LOCKED TAKEOVER over the grid, not an
        alternative to it — the grid stays mounted underneath so dismissing
        returns to exactly the grid you left.
      */}
      {view === "slider" && (
        <PersonSlider
          people={visible}
          index={sliderIndex}
          onIndexChange={(i) => setFocusedId(visible[i]?.id ?? null)}
          emptyLabel={t("noResults")}
          onClose={() => {
            setView("grid");
            // Dismissing the lockup also drops the focus, so you land on a
            // clean grid rather than one card still singled out.
            setFocusedId(null);
          }}
          title={t("title")}
          closeLabel={tf("close")}
        />
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center text-body-l text-black02/70">
          {t("noResults")}
        </p>
      ) : (
        /* Flat grid — no contribution grouping (PHASE11 §10). */
        <div
          data-card-grid
          /* Dims the non-focused cards while one is open (PHASE12 §7). */
          data-card-open={view === "grid" && focusedId !== null}
          /* 23rem yields 3 columns at full width, 2 when pushed. */
          style={{ ["--card-min" as string]: "23rem" }}
          className="grid items-start gap-8"
        >
          {visible.map((m, i) => (
            <Reveal
              key={m.id}
              index={i % 3}
              /* Lifts the open card's stacking context above its siblings —
                 `.anim-reveal`'s transform makes each wrapper its own. */
              className={focusedId === m.id ? "relative z-30" : ""}
            >
              <TeamCard
                member={m}
                /*
                 * Scoped to GRID view. `focusedId` does double duty — it is
                 * the slider's index as well as the grid's open card — and
                 * the grid stays mounted under the lockup. Without this,
                 * advancing the slider opened the card underneath too: on
                 * mobile that is a portalled bottom sheet at z-100, so it
                 * landed on top of the lockup and looked exactly like having
                 * tapped the card instead of the next button.
                 */
                open={view === "grid" && focusedId === m.id}
                onToggle={(card) => toggleCard(m.id, card)}
                onClose={() => setFocusedId(null)}
                tilt={TILT[i % TILT.length]}
                popover
                side={side}
              />
            </Reveal>
          ))}
        </div>
      )}
    </FilterLayout>
  );
}
