"use client";

import { useEffect, useRef } from "react";
import { drawStickerPreview } from "@/lib/dp/compose";

/**
 * The sticker cluster spread across the hero.
 *
 * ## What is reused, and what is not
 *
 * The ARTWORK is the DP generator's, exactly: `drawStickerPreview` is the
 * same routine the picker chips call, reading the same `stickers.ts` sheet.
 * A sticker added there appears in both places, drawn identically, with no
 * second copy of the paths to keep in sync. That is the reuse that matters.
 *
 * The DP generator's sticker INTERACTION is not reused, and that is
 * deliberate rather than a shortcut. What lives there is a stateful editor —
 * pointer capture, drag deltas, per-sticker position/scale/rotation held in
 * React state and composited into one canvas the visitor is building. It
 * exists so somebody can place a sticker on their own card and keep it.
 *
 * A hero decoration has nothing to keep. Dragging one would be a control that
 * looks like it does something and then forgets it on the next page load,
 * which is worse than not being draggable. So these respond to the pointer
 * the way the rest of the hero's scenery does — leaning by depth, lifting
 * under the cursor — and the editor stays where the editing is. Noted in
 * ADR 0046.
 *
 * ## Depth
 *
 * `depth` and `blur` are one idea expressed twice: a sticker that is "near"
 * leans further with the pointer and is sharp; a "far" one barely moves and
 * is soft. Getting those two out of step is what makes fake depth of field
 * look like an effect rather than distance.
 *
 * `layer` decides whether a sticker sits in front of the wordmark or behind
 * it — some of each, so the type is genuinely inside the cluster rather than
 * under a sheet of it.
 */
export interface HeroSticker {
  id: string;
  /** Percentage box, so the cluster scales with the section, not with px. */
  left: string;
  top: string;
  /** Rendered size in px at the base breakpoint. */
  size: number;
  tilt: number;
  depth: number;
  blur: number;
  layer: "behind" | "front";
  bob: number;
  bobDur: number;
  bobDelay: number;
  /**
   * The two layouts are different enough that most stickers belong to one of
   * them. A percentage that sits in open space on a desktop lands on the CTA
   * buttons on a phone, because the phone stacks what the desktop puts side
   * by side — so the cluster is authored twice rather than scaled once.
   */
  only?: "desktop" | "mobile";
}

export function HeroStickers({
  stickers,
  locale,
  layer,
}: {
  stickers: HeroSticker[];
  locale: "fr" | "en";
  layer: "behind" | "front";
}) {
  return (
    <>
      {stickers
        .filter((s) => s.layer === layer)
        .map((sticker) => (
          <StickerMark key={sticker.id} sticker={sticker} locale={locale} />
        ))}
    </>
  );
}

function StickerMark({
  sticker,
  locale,
}: {
  sticker: HeroSticker;
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
    <div
      className={`hero-sticker ${
        sticker.only === "desktop"
          ? "hidden sm:block"
          : sticker.only === "mobile"
            ? "block sm:hidden"
            : ""
      }`}
      style={
        {
          left: sticker.left,
          top: sticker.top,
          "--tilt": `${sticker.tilt}deg`,
          "--depth": `${sticker.depth}px`,
          "--blur": `${sticker.blur}px`,
        } as React.CSSProperties
      }
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
    </div>
  );
}
