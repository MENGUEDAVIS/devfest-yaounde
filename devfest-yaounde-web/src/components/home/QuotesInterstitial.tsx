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
    // compliant approach here is to just not auto-advance for
    // reduced-motion users; manual dot navigation still works.
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % quoteList.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  const quote = quoteList[index];

  return (
    <SectionContainer background="pastel-yellow" maxWidth="3xl">
      <h2 className="text-center text-caption font-mono uppercase tracking-wide text-black02/60">
        {t("title")}
      </h2>
      <div key={quote.id} className={`${fadeInUp} mt-6 text-center`}>
        <p className="text-heading-l font-bold text-black02">
          &ldquo;{quote.text[locale]}&rdquo;
        </p>
        <p className="mt-4 text-body-m text-black02/70">
          {quote.author}
          {quote.role ? ` · ${quote.role[locale]}` : ""}
        </p>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {quoteList.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}`}
            aria-current={i === index}
            className={`h-2.5 w-2.5 rounded-pill transition-colors ${
              i === index ? "bg-black02" : "bg-black02/20"
            }`}
          />
        ))}
      </div>
    </SectionContainer>
  );
}
