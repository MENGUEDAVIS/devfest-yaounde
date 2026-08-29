"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import type { FaqItem } from "@/data/types";

export interface FaqAccordionProps {
  faq: FaqItem;
  open: boolean;
  onToggle: () => void;
  /** Optional trailing content, e.g. a contextual link. */
  children?: ReactNode;
}

/**
 * One casual FAQ accordion row — the treatment built for the Home preview in
 * PHASE5 §6, extracted here so `/faqs` reuses it instead of a second version.
 *
 * Friendly rounded row, bouncy chevron, height animated with the
 * grid-template-rows 1fr -> 0fr technique (animates auto-height without
 * measuring in JS). Real button semantics with aria-expanded/aria-controls
 * and a labelled region, so it's keyboard-operable.
 */
export function FaqAccordion({
  faq,
  open,
  onToggle,
  children,
}: FaqAccordionProps) {
  const locale = useLocale() as "fr" | "en";

  return (
    <div
      className={`${open ? "faq-open" : ""} overflow-hidden rounded-lg border-2 border-black02 transition-[background-color,box-shadow,transform] duration-300 ease-bouncy motion-reduce:transition-none ${
        open
          ? "bg-offwhite shadow-[0_5px_0_0_var(--color-black02)]"
          : "bg-transparent hover:-translate-y-0.5 hover:bg-offwhite/60 motion-reduce:transform-none"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${faq.id}`}
        id={`faq-trigger-${faq.id}`}
        className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left sm:px-7"
      >
        <span className="font-sans text-heading-m font-bold text-black02">
          {faq.question[locale]}
        </span>
        {/* Signature moment (/faqs): the toggle glyph flips from "?" to "!"
            as the answer opens — a question becoming an answer. It's
            aria-hidden and purely decorative: the button already gets its
            accessible name from the question text, and its state from
            aria-expanded. */}
        <span
          aria-hidden
          className={`faq-glyph h-9 w-9 shrink-0 rounded-pill border-2 border-black02 font-sans text-heading-m font-bold leading-none ${
            open ? "bg-yellow text-black02" : "bg-transparent text-black02/70"
          }`}
        >
          <span className="faq-glyph-a">?</span>
          <span className="faq-glyph-b">!</span>
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-400 ease-out-devfest motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={`faq-panel-${faq.id}`}
            role="region"
            aria-labelledby={`faq-trigger-${faq.id}`}
            className="px-6 pb-6 text-body-l text-black02/80 sm:px-7"
          >
            {faq.answer[locale]}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
