"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { mailtoHref } from "@/lib/mailto";
import { CHAPTER_EMAIL } from "@/lib/site-config";

/**
 * "Your question isn't here?" — after the last answer (PHASE24).
 *
 * The FAQ can only ever hold the questions somebody thought to write down,
 * and the visitor who reaches the bottom without an answer is exactly who
 * should be one click from a person. So this is a small, friendly block that
 * writes the email FOR them: the question box is PRE-FILLED with whatever they
 * typed into the FAQ search (the best signal there is of what they wanted),
 * an optional name, and a button that opens their mail app with a subject and
 * a polite message already composed around those two fields.
 *
 * A plain mail link (built by `mailtoHref`), computed as they type — no form post, nothing sent
 * by us, nothing stored. The link is a real `<a href>`, so it works with
 * keyboard, screen reader and "copy link address".
 *
 * `search` is the FAQ search box's text. It seeds the question until the
 * visitor edits the box themselves; from then on their words win, so typing
 * in the search field above never overwrites what they are writing here.
 */
export function FaqNoAnswerCta({ search }: { search: string }) {
  const t = useTranslations("pages.faqs");
  const tMail = useTranslations("mail");
  const questionId = useId();
  const nameId = useId();
  const [edited, setEdited] = useState<string | null>(null);
  const [name, setName] = useState("");

  const question = (edited ?? search).trim();

  const href = mailtoHref(CHAPTER_EMAIL, {
    subject: tMail("faqMissing.subject"),
    body: tMail("faqMissing.body", { question, name: name.trim() }),
  });

  const field =
    "mt-1.5 w-full rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-sans text-body-m text-black02 outline-none placeholder:text-black02/50 focus:bg-white";

  return (
    <section
      aria-labelledby={`${questionId}-title`}
      className="mt-16 rounded-lg border-2 border-black02 bg-pastel p-6 shadow-[0_6px_0_0_var(--color-black02)] sm:p-8"
    >
      <h2
        id={`${questionId}-title`}
        className="font-sans text-display-l font-bold leading-tight text-black02"
      >
        {t("noAnswerTitle")}
      </h2>
      <p className="mt-3 max-w-prose text-body-l text-black02/80">
        {t("noAnswerBody")}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label
            htmlFor={questionId}
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70"
          >
            {t("noAnswerQuestion")}
          </label>
          <textarea
            id={questionId}
            rows={3}
            value={edited ?? search}
            onChange={(e) => setEdited(e.target.value)}
            placeholder={t("noAnswerQuestionPlaceholder")}
            className={`${field} resize-y`}
          />
        </div>
        <div>
          <label
            htmlFor={nameId}
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70"
          >
            {t("noAnswerName")}
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder={t("noAnswerNamePlaceholder")}
            className={field}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a
          href={href}
          className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-l font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
        >
          <PaperPlaneTilt size={20} weight="bold" aria-hidden />
          {t("noAnswerCta")}
        </a>
        <p className="text-caption text-black02/70">
          {t("noAnswerHint", { email: CHAPTER_EMAIL })}
        </p>
      </div>
    </section>
  );
}
