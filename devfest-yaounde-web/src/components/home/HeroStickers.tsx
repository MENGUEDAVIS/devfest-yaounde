"use client";

import { useEffect, useRef, useState } from "react";
import { drawStickerPreview } from "@/lib/dp/compose";
import { pickStickers, type PlacedSticker } from "@/lib/hero-stickers";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * The sticker cluster: a different scatter on every page load.
 *
 * ## What is reused, and what is not
 *
 * The ARTWORK is the DP generator's, exactly: `drawStickerPreview` is the same
 * routine the picker chips call, reading the same `stickers.ts` sheet. Add a
 * sticker there and it can appear here, drawn identically, with no second copy
 * of the paths to keep in sync.
 *
 * The DP generator's sticker INTERACTION is not reused, and that is deliberate
 * rather than a shortcut. What lives there is a stateful editor — pointer
 * capture, drag deltas, per-sticker transforms in React state, composited into
 * a card somebody is building and will download. It exists so a sticker can be
 * placed and KEPT.
 *
 * Hero decoration has nothing to keep. Dragging one would be a control that
 * appears to do something and forgets it on the next load, which is worse than
 * not being draggable. So these respond the way the rest of the hero's scenery
 * does — leaning by depth, lifting under the pointer (ADR 0046).
 *
 * ## Why the scatter is generated on the CLIENT
 *
 * `Math.random()` during render is a hydration mismatch waiting to happen: the
 * server picks one scatter, the browser picks another, React finds two
 * different trees and complains. Generating in an effect after mount means the
 * server renders nothing here and the browser fills it in — which is exactly
 * right for a decorative layer, and is why these are `aria-hidden` and carry
 * no content.
 *
 * It also means the page's HTML is identical for every visitor, so the static
 * prerender is still valid; the variety happens in the browser. Generating on
 * the server would have baked ONE scatter at build time and served it to
 * everybody forever, which is the opposite of the intent.
 */
export function HeroStickers({ locale }: { locale: "fr" | "en" }) {
  /*
    The breakpoint is read here rather than passed down, because the two zone
    maps are not two sizes of one layout — they are different maps, and which
    one applies is a browser fact the server cannot know. It is also already a
    client decision: the scatter is generated after mount either way.
  */
  const mobile = useMediaQuery("(max-width: 639px)");
  const [placed, setPlaced] = useState<PlacedSticker[] | null>(null);

  useEffect(() => {
    /*
      On the next tick, not in the effect body: a `setState` there is what
      `react-hooks/set-state-in-effect` refuses, and rightly — it is a second
      render pass hidden inside the first. The scatter is decoration that
      arrives with its own staggered entrance anyway, so one tick later is
      invisible. Same pattern `AdminChart` uses for the same rule.
    */
    const id = window.setTimeout(() => setPlaced(pickStickers(mobile)), 0);
    return () => window.clearTimeout(id);
  }, [mobile]);

  if (!placed) return null;

  /*
    BOTH LAYERS FROM ONE COMPONENT, and one scatter between them.

    This was two mounts — `layer="behind"` and `layer="front"` — each running
    its own effect and so generating its OWN independent scatter, then
    throwing away the half that did not match its layer. Two scatters means
    two draws from the sheet, and the same sticker could be picked by both:
    the front layer and the back layer each rendered a bracket mark, side by
    side, which is exactly what sampling without replacement was supposed to
    prevent.

    One mount, one draw, two positioned wrappers. Their DOM order does not
    matter — `z-index` decides what paints over the wordmark and what hides
    behind it.
  */
  const render = (layer: "behind" | "front") =>
    placed
      .filter((s) => s.layer === layer)
      .map((sticker) => (
        /*
          The key is the placement's own id, not the sticker's. The sheet is
          sampled without replacement so an id cannot repeat within one
          scatter — but keying on something that CAN collide is how the
          hand-authored list ended up rendering two `burst`es and losing one.
        */
        <StickerMark key={sticker.key} sticker={sticker} locale={locale} />
      ));

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {render("behind")}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
        {render("front")}
      </div>
    </>
  );
}

function StickerMark({
  sticker,
  locale,
}: {
  sticker: PlacedSticker;
  locale: "fr" | "en";
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    /*
      Drawn at 2× the CSS size and scaled down by the element's own width, so
      it stays crisp on a retina screen. `document.fonts.ready` re-runs it
      because the text stickers measure the loaded face — without it they are
      drawn once against the fallback and left there.
    */
    const draw = () =>
      drawStickerPreview(canvas, sticker.id, locale, sticker.size * 2);
    draw();
    void document.fonts?.ready.then(draw);
  }, [sticker.id, sticker.size, locale]);

  return (
    /*
      THREE NESTED LAYERS, each owning ONE transform source, for the same
      reason `.hero-word-exit` and `.hero-satellite`/`.hero-satellite-inner`
      are split elsewhere in this file: a CSS animation with `fill: both`
      (which `.hero-settle` is) permanently overrides the STATIC `transform`
      on whatever element it runs on, even after it finishes. Putting
      `hero-settle` directly on `.hero-sticker` — which is what happened here
      — meant the entrance's `translate3d(0,0,0)` end-state silently replaced
      the parallax AND the rotation forever, on every sticker, the moment it
      finished settling in. Confirmed by reading the computed transform back:
      every sticker sat at `matrix(1,0,0,1,0,0)` regardless of `--px`/`--py`
      or `--tilt`.

      Outer: parallax + tilt (`.hero-sticker`, no animation of its own).
      Middle: the one-shot entrance (`.hero-settle`, new here).
      Inner: the infinite ambient bob (`.hero-sticker-inner`, unchanged).
    */
    <div
      className="hero-sticker"
      style={
        {
          left: `${sticker.left}%`,
          top: `${sticker.top}%`,
          "--tilt": `${sticker.tilt}deg`,
          "--depth": `${sticker.depth}px`,
          "--blur": `${sticker.blur}px`,
        } as React.CSSProperties
      }
    >
      <span
        className="hero-settle block"
        style={{ ["--settle-delay" as string]: `${sticker.settle}ms` }}
      >
        <span
          className="hero-sticker-inner"
          style={
            {
              "--bob": `${sticker.bob}px`,
              "--bob-dur": `${sticker.bobDur}s`,
              "--bob-delay": `${sticker.bobDelay}ms`,
            } as React.CSSProperties
          }
        >
          {/*
            The hover target is the canvas, not the positioned wrapper: the
            wrapper carries the pointer-lean transform, and a `:hover` rule on
            the same element would replace it rather than compose with it.
          */}
          <canvas
            ref={ref}
            aria-hidden
            className="hero-sticker-hit block"
            style={{ width: sticker.size, height: sticker.size }}
          />
        </span>
      </span>
    </div>
  );
}
