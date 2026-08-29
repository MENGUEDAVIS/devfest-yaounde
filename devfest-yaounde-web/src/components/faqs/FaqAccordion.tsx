"use client";

import { CaretDown } from "@phosphor-icons/react";
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
      className={`overflow-hidden rounded-lg border-2 border-black02 transition-[background-color,box-shadow,transform] duration-300 ease-bouncy motion-reduce:transition-none ${
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
        <span
          aria-hidden
          className={`shrink-0 rounded-pill border-2 border-black02 p-1.5 transition-transform duration-300 ease-bouncy motion-reduce:transition-none ${
            open ? "rotate-180 bg-yellow" : "bg-transparent"
          }`}
        >
          <CaretDown size={20} weight="bold" />
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
