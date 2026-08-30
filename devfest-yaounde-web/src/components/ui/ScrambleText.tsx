"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Glyphs the scramble cycles through. Deliberately ASCII-ish and monospace-y
 * so the churn reads as "decoding" rather than as a different language, and
 * deliberately WITHOUT accented characters — the resolved text supplies those
 * from the real string.
 */
const GLYPHS = "!<>-_\\/[]{}—=+*^?#░▒▓01";

/**
 * Pacing (PHASE12 §4). The first version resolved in ~9 frames, which read as
 * a blink rather than a decode. These numbers are tuned to be WATCHABLE:
 * a glyph is held for several frames before changing, and each character
 * starts later than the one before it, so the resolve sweeps visibly across
 * the word. A short title takes roughly a second and a half.
 */
/** Frames each character churns before it locks. */
const CHURN_FRAMES = 26;
/** Frames between one character starting and the next. */
const STAGGER_FRAMES = 4;
/** Frames a single random glyph is held before being swapped. Slows the churn. */
const GLYPH_HOLD = 3;

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
  const nodeRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);

  const scramble = useCallback(() => {
    const node = nodeRef.current;
    if (!node || frameRef.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chars = [...text];
    // Each character gets its own start/end frame, so the resolve sweeps
    // across the word instead of every letter locking at once.
    const schedule = chars.map((_, i) => ({
      start: i * STAGGER_FRAMES,
      end: i * STAGGER_FRAMES + CHURN_FRAMES,
    }));
    const total = schedule[schedule.length - 1]?.end ?? 0;
    // One held glyph per character, refreshed every GLYPH_HOLD frames.
    const held = chars.map(() => GLYPHS[0]);
    let frame = 0;

    const tick = () => {
      const out = chars.map((c, i) => {
        // Whitespace never churns — scrambling the gaps makes the word lose
        // its shape and reads as noise rather than as decoding.
        if (c.trim() === "") return c;
        if (frame < schedule[i].start || frame >= schedule[i].end) return c;
        if (frame % GLYPH_HOLD === 0) {
          held[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        return held[i];
      });
      node.textContent = out.join("");

      if (frame >= total) {
        node.textContent = text;
        frameRef.current = null;
        return;
      }
      frame++;
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [text]);

  // Cancel an in-flight scramble if the title unmounts mid-decode, and put
  // the real text back so a remount never inherits a half-decoded string.
  useEffect(() => {
    const node = nodeRef.current;
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      if (node) node.textContent = text;
    };
  }, [text]);

  return (
    <span className={`scramble ${className}`} onClick={scramble}>
      {/* The stable, correct text for assistive tech and for copy/paste. */}
      <span className="sr-only">{text}</span>
      <span ref={nodeRef} aria-hidden>
        {text}
      </span>
    </span>
  );
}
