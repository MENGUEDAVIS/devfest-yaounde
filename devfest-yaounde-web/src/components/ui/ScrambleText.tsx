"use client";

import { useScramble } from "@/lib/use-scramble";

/**
 * Glyphs the scramble cycles through. Deliberately ASCII-ish and monospace-y
 * so the churn reads as "decoding" rather than as a different language, and
 * deliberately WITHOUT accented characters — the resolved text supplies those
 * from the real string.
 */
export interface ScrambleTextProps {
  /** The real text. This is what renders on the server and what it resolves to. */
  text: string;
  className?: string;
}

/**
 * Text-scramble / decode easter egg — PHASE11 §1, reworked in PHASE12 §4.
 *
 * CLICK a page's top title and each character churns through random glyphs,
 * then resolves left to right back to the ORIGINAL text.
 *
 * IT IS A HIDDEN EGG, and PHASE12 made that literal:
 *  - Click only. Hover does nothing.
 *  - No underline, no dotted decoration, no colour change — no affordance at
 *    all. The earlier version advertised itself, which made it a feature
 *    rather than a secret.
 *  - The cursor does NOT change over it. Adding a pointer cursor would give
 *    the game away just as loudly as an underline.
 *  - It never runs on page load. The title renders normally, always.
 *
 * SCOPE: one per page — the top-level H1 only, never sub-headings.
 *
 * It animates the REAL DOM text, so "Yaoundé" resolves to "Yaoundé". That is
 * why this replaced the ASCII-art banner it supersedes: that needed a bitmap
 * block font with no accented glyphs, so it could only have misspelled the
 * city or left a hole.
 *
 * Accessibility: the mid-scramble string is nonsense, so it must never reach
 * assistive tech. The real text stays in the DOM as an `sr-only` span and the
 * animating span is `aria-hidden`. A screen reader always reads the headline;
 * it just never hears the churn. It is not a button and takes no focus —
 * there is nothing here a keyboard user needs to reach, and announcing a
 * decorative control would be worse than omitting it.
 *
 * Reduced motion: the click does nothing at all; the text simply stays put.
 *
 * The animation writes to the DOM node directly through rAF instead of
 * setState-per-frame: a 60fps re-render of a display headline for the length
 * of the effect is real work for a purely decorative moment.
 */
export function ScrambleText({ text, className = "" }: ScrambleTextProps) {
  /* The pacing, the glyph set and the reduced-motion guard live in the hook,
     which the preloader also uses. Two copies of that is how two things
     meant to look identical drift apart. */
  const { ref, start } = useScramble<HTMLSpanElement>({ text });

  return (
    <span className={`scramble ${className}`} onClick={start}>
      {/* The stable, correct text for assistive tech and for copy/paste. */}
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
