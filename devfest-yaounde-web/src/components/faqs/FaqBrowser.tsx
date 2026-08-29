"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Link } from "@/i18n/navigation";
import { CODE_OF_CONDUCT_URL } from "@/lib/site-config";
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

/**
 * Grouped, searchable FAQ — PAGES.md §5.
 *
 * Reuses the Home preview's `FaqAccordion` rather than a second accordion
 * implementation. Search filters live as you type across both the question
 * and the answer, and empty categories drop out entirely so the page never
 * shows a heading with nothing under it.
 *
 * Per §5, answers link out where relevant — the tickets and code-of-conduct
 * categories get a contextual link appended.
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

  return (
    <>
      <Reveal>
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
      </Reveal>

      {grouped.length === 0 ? (
        <p className="mt-12 rounded-lg border-2 border-dashed border-black02/30 px-7 py-14 text-center text-body-l text-black02/70">
          {t("noResults")}
        </p>
      ) : (
        <div className="mt-14 flex flex-col gap-16">
          {grouped.map(({ cat, items }) => (
            <section key={cat}>
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
                      {cat === "tickets" && (
                        <Link
                          href="/tickets"
                          className="mt-4 inline-block font-sans text-body-m font-bold text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
                        >
                          {t("seeTickets")}
                        </Link>
                      )}
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
    </>
  );
}
