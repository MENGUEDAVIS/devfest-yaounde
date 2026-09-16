"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties } from "react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { fadeInUp, quoteProgress } from "@/lib/motion";
import type { Quote } from "@/data/types";
import { QuoteStickers } from "./QuoteStickers";

const ROTATE_MS = 6000;

export function QuotesInterstitial({ quotes }: { quotes: Quote[] }) {
  const quoteList = quotes;
  const t = useTranslations("home.quotes");
  const locale = useLocale() as "fr" | "en";
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // WCAG 2.2.2: auto-advancing content must be pausable — simplest compliant
  // approach here is to not auto-advance for reduced-motion users; manual dot
  // navigation still works. Watched with `addEventListener("change", …)` so
  // toggling the OS setting mid-visit takes effect immediately, the same
  // rule `CustomCursor` follows for its own two hard gates.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /*
   * A `setTimeout` re-armed on every `index` change, not one `setInterval`
   * that runs forever — clicking a dot manually must restart the countdown
   * to the NEXT advance, or the active dot's progress fill (below) would be
   * showing time left on a schedule the click just invalidated.
   */
  useEffect(() => {
    if (reduceMotion) return;
    // Nothing to rotate between (and `% 0` is NaN).
    if (quoteList.length < 2) return;

    const timeout = setTimeout(() => {
      setIndex((i) => (i + 1) % quoteList.length);
    }, ROTATE_MS);
    return () => clearTimeout(timeout);
  }, [index, reduceMotion, quoteList.length]);

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
      <p className="relative text-center font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/65">
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
          audit — but growing the dot itself would wreck the row.

          The active dot doubles as a countdown to its own rotation: it's
          otherwise genuinely hard to tell how long you have left to read
          before the quote changes underneath you. Its track fills left to
          right over the same ROTATE_MS the auto-advance timer uses, so the
          fill completing and the quote changing land in the same frame —
          not a separately-guessed animation duration that could drift out
          of sync with the real timer. Static full/empty (no fill) when
          reduced motion is on or there's only one quote to show, since
          there's nothing being counted down to either way. */}
      <div className="relative mt-12 flex justify-center gap-1">
        {quoteList.map((q, i) => {
          const active = i === index;
          const counting = active && !reduceMotion && quoteList.length >= 2;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
              aria-current={active}
              className="grid h-11 min-w-11 place-items-center px-1.5"
            >
              <span
                className={`relative block h-3.5 overflow-hidden rounded-pill border-2 border-black02 transition-[width] duration-300 ease-bouncy ${
                  active ? "w-10" : "w-3.5"
                }`}
              >
                {counting ? (
                  <span
                    key={index}
                    className={`${quoteProgress} absolute inset-y-0 left-0 bg-primary`}
                    style={
                      { "--quote-rotate-ms": `${ROTATE_MS}ms` } as CSSProperties
                    }
                  />
                ) : (
                  <span
                    className={`absolute inset-0 ${active ? "bg-primary" : "bg-transparent"}`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </SectionContainer>
  );
}
