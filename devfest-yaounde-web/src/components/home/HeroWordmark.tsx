"use client";

import { useScramble } from "@/lib/use-scramble";

/**
 * The hero's anchor: "DevFest Yaoundé", bottom-LEFT, dense, and reactive.
 *
 * ## Why SVG and not an <h1> with a font-size
 *
 * The brief is "spanning most of the width" at every viewport, and CSS cannot
 * do that honestly. `clamp()` guesses a size from the viewport and hopes the
 * string happens to fill it — which is how the old hero packed and clipped on
 * a phone, and how French copy breaks a layout tuned on English.
 *
 * `textLength` with `lengthAdjust="spacing"` states the width as a fact: the
 * line occupies a stated number of units of a 100-unit viewBox, and the
 * letter-spacing absorbs whatever the glyphs need. The viewBox scales to any
 * container, so mobile and ultrawide are the same drawing at different sizes
 * — nothing to pack, nothing to clip, and the é keeps its accent because it
 * is real text.
 *
 * It is also exactly what the preloader does, which is the point: the splash
 * and the hero are the same wordmark drawn the same way, so the handoff reads
 * as one object arriving rather than two animations colliding.
 *
 * ## Left, not centred — and tighter
 *
 * A first pass anchored the line at the viewBox's centre with `textLength`
 * nearly equal to the full width, which is visually indistinguishable from a
 * DELIBERATE left alignment: the string reaches almost edge to edge either
 * way. That read as safe rather than composed — a block that happens to fill
 * its container, not one placed with intent.
 *
 * `textAnchor="start"` at a small fixed inset makes the left edge an actual
 * decision, and **`textLength` is now 5% short of the previous value**
 * (matching a -5% tracking request) rather than 98% of the box — so the line
 * visibly stops before the right edge instead of reaching it, leaving room
 * that is filled by the shapes and facts placed deliberately over it (see
 * `Hero.tsx`).
 *
 * ## Thicker, without a heavier font file
 *
 * Google Sans is loaded at 700 only (ADR 0004) — there is no 800/900 to reach
 * for. `stroke="currentColor"` at a small fraction of the font size adds a
 * consistent rim to every glyph, which is the standard way to fake a heavier
 * cut without shipping a second font weight. `strokeLinejoin="round"` keeps
 * the added weight rounded at the corners rather than sharpening them, which
 * would fight the brand's rounded-everything rule (DESIGN.md §5).
 *
 * ## Reactive: it leans and it recedes
 *
 * `--px`/`--py` (written by `useHeroField` on the hero root) reach this
 * element by ordinary CSS inheritance — no extra JS — and drive a very small
 * rotate, so the giant type itself tilts fractionally toward the pointer
 * rather than only the small satellites doing it. `--exit` drives the same
 * wrapper's lift, scale-down and fade as the hero scrolls out from under the
 * navbar. Both live on ONE wrapper outside the reveal mask, because the mask
 * span already owns the entrance transform (`.hero-word-line`) and a second
 * transform source on the same element would mean one silently overwriting
 * the other rather than combining.
 *
 * ## One line, or two
 *
 * ONE line on `sm` and up. Fifteen characters across the width is a dense,
 * solid block of grotesk — the §7b look — and it still leaves the upper half
 * of the viewport clear, which the composition is built on.
 *
 * TWO lines below `sm`, because one line of fifteen characters on a 390px
 * phone renders too thin to be the star of anything at a height that fits.
 * Split, each half is seven characters and reads as big again.
 *
 * **"DevFest" and "Yaoundé" are both seven characters**, so the two mobile
 * lines take almost identical letter-spacing and stack as a deliberately set
 * block. That is luck, and it is why the split works as cleanly as it does.
 *
 * ## Capped by height on the aspect ratios that break width-driven scaling
 *
 * The line's rendered HEIGHT follows its width, because a `viewBox` scales
 * uniformly — that is the whole reason it never packs or clips. On an
 * ordinary screen that is exactly right. On an ultrawide monitor it is not:
 * the same width is much taller relative to the viewport, and a line sized
 * to "span most of the width" there rendered at nearly 40% of the viewport's
 * height, tall enough to push the tagline and the floating date fact into
 * each other — found by screenshot at 2560×1080, not by inspecting the
 * numbers.
 *
 * `maxVh` bounds the rendered height (`max-h-[Xvh]`, with `w-auto h-auto
 * max-w-full` replacing a flat `w-full`), which is the standard
 * responsive-image sizing algorithm applied to an SVG: width is capped at
 * 100% of the container, height at the given fraction of the viewport,
 * aspect ratio preserved, whichever bound binds first. On every aspect ratio
 * this project actually ships on, the width bound is the tighter one and the
 * line renders exactly as before, full width. Only when a screen is wide
 * enough relative to its own height for the height bound to bind first does
 * it stop reaching the right edge — which is the one case where reaching it
 * would have been too tall, not the normal case degrading.
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
          height={34}
          fontSize={27.5}
          baseline={27.5}
          delayMs={0}
          maxVh={16}
          className="text-black02"
        />
        <Line
          refObject={bottom.ref}
          onClick={bottom.start}
          text="Yaoundé"
          height={34}
          fontSize={27.5}
          baseline={27.5}
          delayMs={130}
          maxVh={16}
          className="text-primary"
        />
      </span>

      {/* Everything else: one dense line. */}
      <span className="hidden sm:block">
        <Line
          refObject={whole.ref}
          onClick={whole.start}
          text="DevFest Yaoundé"
          height={16.5}
          fontSize={14}
          baseline={13.5}
          delayMs={0}
          maxVh={28}
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
  maxVh,
  className,
}: {
  refObject: React.RefObject<SVGTextElement | null>;
  onClick: () => void;
  text: string;
  height: number;
  fontSize: number;
  baseline: number;
  delayMs: number;
  /** Caps the rendered height, in vh — see the file doc comment. */
  maxVh: number;
  className: string;
}) {
  /*
    -5% tracking as a WIDTH, not a CSS letter-spacing value. `textLength`
    already states the line's rendered width as a fact rather than letting
    the browser guess it (see the file doc comment); the natural width this
    face renders at this fontSize/character-count ratio was tuned to ~98% of
    the box in the previous pass, so 5% off that is 93.
  */
  const textLength = 93;
  /* A rim around each glyph, thick enough to read as a heavier cut and thin
     enough not to fatten the é's accent into the mask edge above it. */
  const strokeWidth = fontSize * 0.05;

  return (
    /*
      OUTER: the reactive wrapper, and ONLY that. `--px`/`--py` and `--exit`
      inherit from the hero root. It carries no entrance of its own — at
      --exit:0 its transform is the identity and its opacity is 1, so it
      starts exactly where the mask reveal below already looks right. Giving
      it a second fade-in would be two entrances stacked on one wordmark.
    */
    <span className="hero-word-exit block">
      {/* The mask: a block exactly the line's height with the drawing
          starting below it, so the line rises out of a hard edge. */}
      <span className="hero-word block overflow-hidden">
        <svg
          viewBox={`0 0 100 ${height}`}
          aria-hidden
          onClick={onClick}
          className={`hero-word-line block h-auto w-auto max-w-full ${className}`}
          style={{
            ["--word-delay" as string]: `${delayMs}ms`,
            maxHeight: `${maxVh}vh`,
          }}
        >
          <text
            ref={refObject}
            x="1"
            y={baseline}
            textLength={textLength}
            lengthAdjust="spacing"
            textAnchor="start"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
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
    </span>
  );
}
