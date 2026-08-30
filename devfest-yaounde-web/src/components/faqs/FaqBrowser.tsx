"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FilterLayout } from "@/components/ui/FilterLayout";
import { Reveal } from "@/components/ui/Reveal";
import { CODE_OF_CONDUCT_URL } from "@/lib/site-config";
import { scrollToY } from "@/lib/scroll-source";
import { FaqAccordion } from "./FaqAccordion";
import type { FaqItem } from "@/data/types";

const CATEGORY_ORDER = [
  "general",
  "tickets",
  "venue",
  "shop",
  "code-of-conduct",
] as const;

const CATEGORY_KEY: Record<string, string> = {
  general: "catGeneral",
  tickets: "catTickets",
  venue: "catVenue",
  shop: "catShop",
  "code-of-conduct": "catCodeOfConduct",
};

const sectionId = (cat: string) => `faq-section-${cat}`;

/**
 * Grouped, searchable FAQ — PAGES.md §5, reworked in PHASE10 §8.
 *
 * BEFORE: search sat in the content column above the questions and scrolled
 * away, and the category headings were inert labels — on a long page you lost
 * both your search box and your sense of place.
 *
 * AFTER: search and the category list move into the SHARED floating rail
 * (`FilterLayout`), so they stay put while you read, and the category list is
 * a SCROLLSPY — it highlights whichever group you're currently reading and
 * jumps to a group when clicked. Answers can carry an optional CTA (see
 * `FaqItem.cta`).
 *
 * Reusing `FilterLayout` rather than building a second sticky rail is what
 * gets /faqs the same margin-float layout, mobile drawer, focus trap and
 * scroll lock as /speakers, /schedule and /team, for free and in one place.
 *
 * The scrollspy writes `data-active` straight onto the nav buttons instead of
 * holding the active section in React state. That keeps a scroll-frequency
 * signal out of the render path entirely (the same reasoning as `Reveal`),
 * and it updates BOTH copies of the nav — rail and drawer — with one write,
 * since they share the `data-faq-nav` attribute.
 */
export function FaqBrowser({ faqs }: { faqs: FaqItem[] }) {
  const t = useTranslations("pages.faqs");
  const locale = useLocale() as "fr" | "en";
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = faqs.filter(
    (f) =>
      !q ||
      f.question[locale].toLowerCase().includes(q) ||
      f.answer[locale].toLowerCase().includes(q),
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: matches.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  const visibleCats = grouped.map((g) => g.cat).join(",");

  // --- scrollspy ---
  useEffect(() => {
    const cats = visibleCats ? visibleCats.split(",") : [];
    const sections = cats
      .map((cat) => document.getElementById(sectionId(cat)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    function markActive(cat: string) {
      for (const btn of document.querySelectorAll<HTMLElement>(
        "[data-faq-nav]",
      )) {
        btn.dataset.active = String(btn.dataset.faqNav === cat);
      }
    }

    const observer = new IntersectionObserver(
      () => {
        /*
         * Pick the section whose top is closest to — but not past — the
         * reading line a third of the way down the viewport. Using the
         * observer only as a "something moved" trigger and deciding from
         * live geometry avoids the classic scrollspy bug where fast
         * scrolling delivers entries out of order and the highlight lands
         * on a section you've already passed.
         */
        const line = window.innerHeight / 3;
        let active = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= line) active = section;
        }
        markActive(active.id.replace("faq-section-", ""));
      },
      // A dense threshold list keeps the callback firing throughout a
      // section's pass rather than only at its edges.
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [visibleCats]);

  function jumpTo(cat: string) {
    const el = document.getElementById(sectionId(cat));
    if (!el) return;
    // Offset by the fixed chrome so the heading doesn't land under the navbar.
    const chrome = 160;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    scrollToY(el.getBoundingClientRect().top + window.scrollY - chrome, smooth);
  }

  const sidebar = (
    <>
      <div className="relative">
        <MagnifyingGlass
          size={18}
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
          className="w-full rounded-pill border-2 border-black02 bg-offwhite py-2.5 pl-11 pr-4 text-body-m text-black02 placeholder:text-black02/45"
        />
      </div>

      <nav aria-label={t("jumpLabel")}>
        <p className="mb-3 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
          {t("jumpLabel")}
        </p>
        <ul className="flex flex-col gap-1">
          {grouped.map(({ cat, items }) => (
            <li key={cat}>
              <button
                type="button"
                data-faq-nav={cat}
                onClick={() => jumpTo(cat)}
                className="faq-spy flex w-full items-center justify-between gap-3 rounded-pill px-4 py-2 text-left font-sans text-body-m font-bold text-black02/65"
              >
                <span>{t(CATEGORY_KEY[cat])}</span>
                <span className="font-mono text-caption text-black02/45">
                  {items.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );

  return (
    <FilterLayout
      filters={sidebar}
      title={t("jumpLabel")}
      activeCount={q ? 1 : 0}
      onClearAll={() => setQuery("")}
    >
      {grouped.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-14 text-center text-body-l text-black02/70">
          {t("noResults")}
        </p>
      ) : (
        <div className="flex flex-col gap-16">
          {grouped.map(({ cat, items }) => (
            <section key={cat} id={sectionId(cat)} className="scroll-mt-40">
              <Reveal>
                <h2 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
                  {t(CATEGORY_KEY[cat])}
                </h2>
              </Reveal>
              <div className="mt-6 flex flex-col gap-4">
                {items.map((faq, i) => (
                  <Reveal key={faq.id} index={i}>
                    <FaqAccordion
                      faq={faq}
                      open={openId === faq.id}
                      onToggle={() =>
                        setOpenId(openId === faq.id ? null : faq.id)
                      }
                    >
                      {/* Not a `faq.cta`: this URL is still an unconfirmed
                          placeholder living in site-config, so it can't be
                          authored into the content file yet. */}
                      {cat === "code-of-conduct" && (
                        <a
                          href={CODE_OF_CONDUCT_URL}
                          className="mt-4 inline-block font-sans text-body-m font-bold text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
                        >
                          {t("readConduct")}
                        </a>
                      )}
                    </FaqAccordion>
                  </Reveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </FilterLayout>
  );
}
