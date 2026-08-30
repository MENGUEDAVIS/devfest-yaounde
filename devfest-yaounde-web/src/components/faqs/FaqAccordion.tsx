"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { FaqItem } from "@/data/types";

export interface FaqAccordionProps {
  faq: FaqItem;
  open: boolean;
  onToggle: () => void;
  /**
   * Escape hatch for trailing content the CONTENT can't express — currently
   * just the code-of-conduct link, whose URL lives in site-config because it
   * is still an unconfirmed placeholder. Authored CTAs use `faq.cta`.
   */
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
            open ? "bg-primary text-black02" : "bg-transparent text-black02/70"
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
            {/* The answer is its own paragraph so the CTA below can never
                sit inline with the last line of text (PHASE11 §9). */}
            <p>{faq.answer[locale]}</p>

            {/*
              Optional CTA (PHASE10 §8) — rendered only when the item actually
              carries one, so answers without a useful next step stay clean.
              Internal hrefs go through the locale-aware Link so the CTA never
              drops the visitor out of their language.

              PHASE11 §9: block-level, on its own line. `inline-flex` inside a
              block wrapper keeps the button hugging its label while the
              wrapper forces the line break — an `inline-flex` alone would
              have flowed into the answer's last line.
            */}
            {faq.cta &&
              (faq.cta.external ? (
                <div className="mt-1">
                  <a
                    href={faq.cta.href}
                    className="faq-cta mt-5 inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
                  >
                    {faq.cta.label[locale]}
                    <ArrowRight size={16} weight="bold" aria-hidden />
                  </a>
                </div>
              ) : (
                <div className="mt-1">
                  <Link
                    href={faq.cta.href}
                    className="faq-cta mt-5 inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
                  >
                    {faq.cta.label[locale]}
                    <ArrowRight size={16} weight="bold" aria-hidden />
                  </Link>
                </div>
              ))}

            {/* Same rule for the escape-hatch link. */}
            {children && <div className="mt-1">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
