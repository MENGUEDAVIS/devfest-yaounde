"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { fadeInUp } from "@/lib/motion";
import type { Quote } from "@/data/types";
import { QuoteStickers } from "./QuoteStickers";

const ROTATE_MS = 6000;

export function QuotesInterstitial({ quotes }: { quotes: Quote[] }) {
  const quoteList = quotes;
  const t = useTranslations("home.quotes");
  const locale = useLocale() as "fr" | "en";
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // WCAG 2.2.2: auto-advancing content must be pausable — simplest
    // compliant approach here is to not auto-advance for reduced-motion
    // users; manual dot navigation still works.
    if (reduceMotion) return;
    // Nothing to rotate between (and `% 0` is NaN).
    if (quoteList.length < 2) return;

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % quoteList.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [quoteList.length]);

  /*
    Every testimonial can now be hidden from the dashboard, so an empty list
    is a real state. Rendering the section anyway would put a heading over a
    blank quote (and `quoteList[0]` would be undefined). No quotes, no
    section.
  */
  if (quoteList.length === 0) return null;
  // Clamp: a list that shrank under a running rotation must not index past
  // its end for the one render before the interval corrects it.
  const quote = quoteList[index % quoteList.length];

  return (
    <SectionContainer
      background="yellow-wash"
      maxWidth="4xl"
      className="relative overflow-hidden"
    >
      <QuoteStickers locale={locale} />
      <p className="relative text-center font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
        {t("title")}
      </p>

      {/* key forces the entrance animation to replay on each rotation */}
      <blockquote
        key={quote.id}
        className={`${fadeInUp} relative mt-10 text-center`}
      >
        <p className="font-sans text-display-l font-bold text-black02">
          &ldquo;{quote.text[locale]}&rdquo;
        </p>
        <footer className="mt-8 flex items-center justify-center gap-3 font-mono text-caption text-black02/70">
          {quote.avatarUrl && (
            // Decorative: the name sits right beside it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-pill border-2 border-black02 object-cover"
            />
          )}
          <span>
            {/* No known name: a generic attribution, never an invented one. */}
            {quote.author.trim() || t("communityMember")}
            {quote.role?.[locale] ? ` · ${quote.role[locale]}` : ""}
          </span>
        </footer>
      </blockquote>

      {/* The dot stays a dot; the BUTTON around it is thumb-sized. A 14px
          target is a miss waiting to happen, and it fails the tap-target
          audit — but growing the dot itself would wreck the row. */}
      <div className="relative mt-12 flex justify-center gap-1">
        {quoteList.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}`}
            aria-current={i === index}
            className="grid h-11 min-w-11 place-items-center px-1.5"
          >
            <span
              className={`h-3.5 rounded-pill border-2 border-black02 transition-[width,background-color] duration-300 ease-bouncy ${
                i === index ? "w-10 bg-primary" : "w-3.5 bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>
    </SectionContainer>
  );
}
