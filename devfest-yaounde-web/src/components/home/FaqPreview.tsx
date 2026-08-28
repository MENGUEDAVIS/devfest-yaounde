"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import faqs from "@/data/faqs.json";
import type { FaqItem } from "@/data/types";

const faqList = faqs as FaqItem[];

/**
 * Casual accordions (PHASE5 §6) — friendly rounded rows with a bouncy
 * chevron, not a formal FAQ list. Height animates via the
 * grid-template-rows 1fr -> 0fr technique used elsewhere in the project,
 * which animates auto-height content smoothly without measuring it in JS.
 */
export function FaqPreview() {
  const t = useTranslations("home.faq");
  const locale = useLocale() as "fr" | "en";
  const [openId, setOpenId] = useState<string | null>(faqList[0]?.id ?? null);

  return (
    <SectionContainer background="yellow-wash" maxWidth="4xl">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-sans text-display-xl font-bold text-black02">
            {t("title")}
          </h2>
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50">
            {t("toggleHint")}
          </p>
        </div>
      </Reveal>

      <div className="mt-14 flex flex-col gap-4">
        {faqList.map((faq, i) => {
          const isOpen = openId === faq.id;
          return (
            <Reveal key={faq.id} index={i}>
              <div
                className={`overflow-hidden rounded-lg border-2 border-black02 transition-[background-color,box-shadow,transform] duration-300 ease-bouncy ${
                  isOpen
                    ? "bg-offwhite shadow-[0_5px_0_0_var(--color-black02)]"
                    : "bg-transparent hover:-translate-y-0.5 hover:bg-offwhite/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${faq.id}`}
                  id={`faq-trigger-${faq.id}`}
                  className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left sm:px-7"
                >
                  <span className="font-sans text-heading-m font-bold text-black02">
                    {faq.question[locale]}
                  </span>
                  <span
                    className={`shrink-0 rounded-pill border-2 border-black02 p-1.5 transition-transform duration-300 ease-bouncy ${
                      isOpen ? "rotate-180 bg-yellow" : "bg-transparent"
                    }`}
                  >
                    <CaretDown size={20} weight="bold" />
                  </span>
                </button>

                <div
                  className="grid transition-[grid-template-rows] duration-400 ease-out-devfest motion-reduce:transition-none"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${faq.id}`}
                      className="px-6 pb-6 text-body-l text-black02/80 sm:px-7"
                    >
                      {faq.answer[locale]}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <div className="mt-12">
          <Button tone="black02" variant="secondary" href="/faqs" size="md">
            {t("cta")}
          </Button>
        </div>
      </Reveal>
    </SectionContainer>
  );
}
