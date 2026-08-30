"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Glyphs the scramble cycles through. Deliberately ASCII-ish and monospace-y
 * so the churn reads as "decoding" rather than as a different language, and
 * deliberately WITHOUT accented characters — the resolved text supplies those
 * from the real string.
 */
const GLYPHS = "!<>-_\\/[]{}—=+*^?#░▒▓01";

/** How many frames a character churns before it locks, per index step. */
const STEP_FRAMES = 2;
/** Frames of churn before the first character locks. */
const LEAD_FRAMES = 6;

export interface ScrambleTextProps {
  /** The real text. This is what renders on the server and what it resolves to. */
  text: string;
  /** Also fire on click — used to make the effect discoverable on touch. */
  triggerOnClick?: boolean;
  className?: string;
}

/**
 * Text-scramble / decode effect — PHASE11 §1.
 *
 * On hover, each character rapidly cycles through random glyphs and then
 * resolves, left to right, back to the ORIGINAL text.
 *
 * Why this replaces the ASCII-art banner it supersedes: it animates the REAL
 * DOM text, so "Yaoundé" resolves to "Yaoundé". The banner needed a bitmap
 * block font that had no accented glyphs, which meant either misspelling the
 * city or leaving a hole — the reason that version was never right.
 *
 * Accessibility: the mid-scramble string is nonsense, so it must never reach
 * assistive tech. The real text stays in the DOM as an `sr-only` span and the
 * animating span is `aria-hidden`. A screen reader always reads the headline;
 * it just never hears the churn.
 *
 * Reduced motion: the scramble never starts. `matchMedia` is read at trigger
 * time rather than cached, so a user changing the OS setting mid-session gets
 * the new behaviour without a reload.
 *
 * The animation writes to the DOM node directly through rAF instead of
 * setState-per-frame: a 60fps re-render of a display headline for the length
 * of the effect is real work for a purely decorative moment.
 */
export function ScrambleText({
  text,
  triggerOnClick = false,
  className = "",
}: ScrambleTextProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  // Running state is rendered (it drives the cursor affordance), so it is
  // state — refs must never be read during render.
  const [running, setRunning] = useState(false);

  const scramble = useCallback(() => {
    const node = nodeRef.current;
    if (!node || frameRef.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chars = [...text];
    // Each character gets its own start/end frame, so the resolve sweeps
    // across the word instead of every letter locking at once.
    const schedule = chars.map((_, i) => ({
      start: i * STEP_FRAMES,
      end: i * STEP_FRAMES + LEAD_FRAMES,
    }));
    const total = schedule[schedule.length - 1]?.end ?? 0;
    let frame = 0;

    setRunning(true);

    const tick = () => {
      const out = chars.map((c, i) => {
        // Whitespace never churns — scrambling the gaps makes the word
        // lose its shape and reads as noise rather than as decoding.
        if (c.trim() === "") return c;
        if (frame >= schedule[i].end) return c;
        if (frame < schedule[i].start) return c;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
      node.textContent = out.join("");

      if (frame >= total) {
        node.textContent = text;
        frameRef.current = null;
        setRunning(false);
        return;
      }
      frame++;
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [text]);

  return (
    <span
      className={`scramble ${running ? "is-scrambling" : ""} ${className}`}
      onPointerEnter={scramble}
      onFocus={scramble}
      onClick={triggerOnClick ? scramble : undefined}
    >
      {/* The stable, correct text for assistive tech and for copy/paste. */}
      <span className="sr-only">{text}</span>
      <span ref={nodeRef} aria-hidden>
        {text}
      </span>
    </span>
  );
}
