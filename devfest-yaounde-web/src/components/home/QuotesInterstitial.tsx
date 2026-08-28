"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import quotes from "@/data/quotes.json";
import { fadeInUp } from "@/lib/motion";
import type { Quote } from "@/data/types";

const quoteList = quotes as Quote[];
const ROTATE_MS = 6000;

export function QuotesInterstitial() {
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

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % quoteList.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  const quote = quoteList[index];

  return (
    <SectionContainer background="yellow-wash" maxWidth="4xl">
      <p className="text-center font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
        {t("title")}
      </p>

      {/* key forces the entrance animation to replay on each rotation */}
      <blockquote key={quote.id} className={`${fadeInUp} mt-10 text-center`}>
        <p className="font-sans text-display-l font-bold text-black02">
          &ldquo;{quote.text[locale]}&rdquo;
        </p>
        <footer className="mt-8 font-mono text-caption text-black02/70">
          {quote.author}
          {quote.role ? ` · ${quote.role[locale]}` : ""}
        </footer>
      </blockquote>

      <div className="mt-12 flex justify-center gap-3">
        {quoteList.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}`}
            aria-current={i === index}
            className={`h-3.5 rounded-pill border-2 border-black02 transition-[width,background-color] duration-300 ease-bouncy ${
              i === index ? "w-10 bg-yellow" : "w-3.5 bg-transparent"
            }`}
          />
        ))}
      </div>
    </SectionContainer>
  );
}
