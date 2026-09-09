"use client";

import { useScramble } from "@/lib/use-scramble";

/**
 * The hero's anchor: "DevFest Yaoundé", stretched to the full width.
 *
 * ## Why SVG and not an <h1> with a font-size
 *
 * The brief is "spanning most of the width" at every viewport, and CSS cannot
 * do that honestly. `clamp()` guesses a size from the viewport and hopes the
 * string happens to fill it — which is how the old hero packed and clipped on
 * a phone, and how French copy breaks a layout tuned on English.
 *
 * `textLength` with `lengthAdjust="spacing"` states the width as a fact: the
 * line IS 98 units of a 100-unit viewBox, and the letter-spacing absorbs
 * whatever the glyphs need. The viewBox scales to any container, so mobile
 * and ultrawide are the same drawing at different sizes — nothing to pack,
 * nothing to clip, and the é keeps its accent because it is real text.
 *
 * It is also exactly what the preloader does, which is the point: the splash
 * and the hero are the same wordmark drawn the same way, so the handoff reads
 * as one object arriving rather than two animations colliding.
 *
 * ## One line, or two
 *
 * ONE line on `sm` and up. Fifteen characters across the width is a dense,
 * solid block of grotesk — which is the §7b look — and it costs about a fifth
 * of the viewport, leaving the empty upper half the composition is built on.
 *
 * TWO lines below `sm`, because one line of fifteen characters on a 390px
 * phone is 35px tall: technically full-width, and far too thin to be the star
 * of anything. Split, each half is seven characters and reads as big again.
 *
 * **"DevFest" and "Yaoundé" are both seven characters**, so the two mobile
 * lines take almost identical letter-spacing and stack as a deliberately set
 * block. That is luck, and it is why the split works as cleanly as it does.
 *
 * The measurements come from the glyph advances of the real face: a seven-
 * character line needs roughly `fontSize × 4` of width, a fifteen-character
 * one roughly `fontSize × 8.2`. Both viewBoxes are then cropped to the cap
 * height plus room for the é's accent, so the line hugs its own type rather
 * than carrying an em-box of dead space above it.
 */
export function HeroWordmark({ srLabel }: { srLabel: string }) {
  /*
    The click-scramble easter egg (EASTER-EGGS.md), on the same hook every
    page title uses. Three text nodes share two scramble handles: the wide
    line is its own, and the two stacked lines each decode separately, like
    the footer wordmark — so clicking "Yaoundé" leaves "DevFest" alone.
  */
  const whole = useScramble<SVGTextElement>({ text: "DevFest Yaoundé" });
  const top = useScramble<SVGTextElement>({ text: "DevFest" });
  const bottom = useScramble<SVGTextElement>({ text: "Yaoundé" });

  return (
    <h1 className="select-none">
      <span className="sr-only">{srLabel}</span>

      {/* Phone: two stacked lines, each seven characters wide. */}
      <span className="block sm:hidden">
        <Line
          refObject={top.ref}
          onClick={top.start}
          text="DevFest"
          height={30}
          fontSize={24.5}
          baseline={25}
          delayMs={0}
          className="text-black02"
        />
        <Line
          refObject={bottom.ref}
          onClick={bottom.start}
          text="Yaoundé"
          height={30}
          fontSize={24.5}
          baseline={25}
          delayMs={130}
          className="text-primary"
        />
      </span>

      {/* Everything else: one dense line. */}
      <span className="hidden sm:block">
        <Line
          refObject={whole.ref}
          onClick={whole.start}
          text="DevFest Yaoundé"
          height={14}
          fontSize={12}
          baseline={12}
          delayMs={0}
          className="text-black02"
        />
      </span>
    </h1>
  );
}

function Line({
  refObject,
  onClick,
  text,
  height,
  fontSize,
  baseline,
  delayMs,
  className,
}: {
  refObject: React.RefObject<SVGTextElement | null>;
  onClick: () => void;
  text: string;
  height: number;
  fontSize: number;
  baseline: number;
  delayMs: number;
  className: string;
}) {
  return (
    /*
      The mask: a block exactly the line's height with the drawing starting
      below it, so the line rises out of a hard edge rather than fading in
      place.
    */
    <span className="hero-word block overflow-hidden">
      <svg
        viewBox={`0 0 100 ${height}`}
        aria-hidden
        onClick={onClick}
        className={`hero-word-line block w-full ${className}`}
        style={{ ["--word-delay" as string]: `${delayMs}ms` }}
      >
        <text
          ref={refObject}
          x="50"
          y={baseline}
          textLength="98"
          lengthAdjust="spacing"
          textAnchor="middle"
          fill="currentColor"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: `${fontSize}px`,
          }}
        >
          {text}
        </text>
      </svg>
    </span>
  );
}
