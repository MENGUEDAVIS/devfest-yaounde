"use client";

import { useScramble } from "@/lib/use-scramble";

/**
 * "DevFest" over "Yaoundé", bottom-left, revealed like a bar chart.
 *
 * ## HTML text, not SVG — and why that is a reversal
 *
 * The previous hero drew this as one SVG `<text>` with `textLength`, because
 * that guarantees a width and so cannot pack or clip. It also makes every
 * glyph a single indivisible node, and this direction needs each CHARACTER to
 * be clipped and timed on its own. There is no way to do that inside one
 * `<text>` element.
 *
 * The packing risk that SVG was protecting against does not apply here, for a
 * reason specific to this string: **both lines are seven characters, and the
 * wordmark is a brand name that is identical in both locales.** There is no
 * French length to blow the layout up, and the two lines cannot disagree
 * about their width. A `vw`-based size is safe when the content is fixed;
 * it was not safe when the old single line had fifteen characters and had to
 * span the full viewport.
 *
 * ## The reveal
 *
 * Each character sits in its own box and is clipped from the bottom —
 * `inset(0 0 100% 0)` to `inset(0 0 0 0)` — so it grows upward out of nothing
 * to its full height, like a bar in a chart. The delay is a function of the
 * character's index, so they arrive **left to right in sequence** rather than
 * together; that progression across the line is the whole analogy. Line two
 * starts after line one is under way, not after it finishes, so the two read
 * as one gesture.
 *
 * `clip-path` rather than a height animation or a masked wrapper: it is
 * composited, it costs no layout, and it clips the glyph exactly — including
 * the é's accent, which grows in with the letter it belongs to instead of
 * being revealed by a separate box.
 *
 * ## No parallax, on purpose
 *
 * This element does not lean toward the pointer and does not recede on
 * scroll. It is the fixed thing the rest of the composition moves against;
 * everything reactive in this hero — the stickers, the dot field — is
 * deliberately something else.
 *
 * ## Weight
 *
 * `700` is the boldest cut of Google Sans that is loaded (ADR 0004 — the
 * family ships 400/500/600/700). The reference's wordmark is heavier than
 * that, so `-webkit-text-stroke` adds a rim to every glyph: the standard way
 * to reach a weight the font file does not contain, without shipping a second
 * font just for two words.
 */
const LINES = [
  { text: "DevFest", tone: "text-black02" },
  { text: "Yaoundé", tone: "text-black02" },
] as const;

/** Milliseconds between one character starting and the next. */
const CHAR_STEP = 52;
/** How far into line one, line two starts. */
const LINE_STEP = 240;

export function HeroWordmark({ srLabel }: { srLabel: string }) {
  /*
    The click-scramble easter egg (EASTER-EGGS.md) survives the rewrite. Each
    line decodes on its own, so clicking "Yaoundé" leaves "DevFest" alone.

    THE SCRAMBLE EATS THE PER-CHARACTER SPANS, and that is fine. It rewrites
    the line's `textContent`, so the first click replaces the split-up
    characters with one plain string. By then the reveal has finished and
    every character is at its resting state, where the only thing the spans
    were doing was carrying an animation that has already ended — so there is
    nothing left to lose. Clicking mid-reveal jumps the line to fully shown,
    which is a reasonable answer to "I clicked it" rather than a glitch.

    The alternative was a second hidden copy for the scramble to chew on, and
    two copies of an h1's text is a worse problem than a decoration that
    outlives its purpose.
  */
  const first = useScramble<HTMLSpanElement>({ text: LINES[0].text });
  const second = useScramble<HTMLSpanElement>({ text: LINES[1].text });
  const handles = [first, second];

  return (
    <h1 className="hero-wordmark select-none">
      <span className="sr-only">{srLabel}</span>

      {LINES.map((line, lineIndex) => (
        <span
          key={line.text}
          aria-hidden
          onClick={handles[lineIndex].start}
          ref={handles[lineIndex].ref}
          className={`hero-line block cursor-default ${line.tone}`}
        >
          {[...line.text].map((char, charIndex) => (
            <span
              // Index is the right key here: the characters of a fixed brand
              // name, in a fixed order, that never reorder.
              key={`${lineIndex}-${charIndex}`}
              className="hero-char"
              style={
                {
                  "--bar-delay": `${lineIndex * LINE_STEP + charIndex * CHAR_STEP}ms`,
                } as React.CSSProperties
              }
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
