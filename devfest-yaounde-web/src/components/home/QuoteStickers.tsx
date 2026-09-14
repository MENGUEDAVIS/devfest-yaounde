"use client";

import { useEffect, useRef } from "react";
import { drawStickerPreview } from "@/lib/dp/compose";

/**
 * A few stickers around "What people are saying" (PHASE21 §B3).
 *
 * THE ARTWORK IS THE DP GENERATOR'S, drawn by the same `drawStickerPreview`
 * the hero uses — no second copy of any sticker.
 *
 * WHICH ONES, and why these three. The brief asked for warm, people-flavoured
 * marks — speech bubbles, hearts, thumbs-up — rather than tech mascots. The
 * set has no heart or thumbs-up, and drawing new ones would be a second
 * sticker source, so the pick is from what exists:
 *   - `bubble` — a speech bubble; literally people saying things.
 *   - `spark`  — small and warm, a flourish rather than a subject.
 *   - `cup`    — the coffee line, where one of these quotes says a co-founder
 *                was found. The hallway, not the stage.
 * Text stickers were ruled out: at this size the preview draws only their
 * first word, so "See you there" would read as a bare "See".
 *
 * WHERE. Only in the section's top and bottom PADDING BANDS — 96px on a phone,
 * 160px from `lg` — which hold no copy at any breakpoint or in either locale.
 * Side margins were rejected: at 1024px the 4xl text column leaves ~64px each
 * side, not enough for a sticker to clear a long French quote. Each sticker's
 * size is chosen to finish inside its band (e.g. 56px at top 16px on a phone
 * ends at 72px, under the 96px band). Measured, not eyeballed: at every width
 * from 360 to 1920px, in both locales and for every quote, no sticker box
 * intersects any copy or the dot controls.
 *
 * FLAT, deliberately: no blur, no parallax, no bob — this section is for
 * reading. A fixed tilt is the only "life", so there is nothing here for
 * reduced motion to switch off. Decorative, so `aria-hidden` and inert.
 *
 * DENSITY: two on a phone, three from `sm`.
 */
const STICKERS = [
  {
    id: "bubble",
    tilt: -9,
    className:
      "left-[5%] top-4 h-14 w-14 sm:left-[7%] sm:top-5 sm:h-16 sm:w-16 lg:left-[9%] lg:top-7 lg:h-24 lg:w-24",
  },
  {
    id: "spark",
    tilt: 14,
    className:
      "hidden right-[10%] top-12 h-10 w-10 sm:block sm:h-12 sm:w-12 lg:right-[15%] lg:top-16 lg:h-14 lg:w-14",
  },
  {
    id: "cup",
    tilt: 8,
    className:
      "bottom-4 right-[6%] h-14 w-14 sm:bottom-8 sm:right-[8%] sm:h-20 sm:w-20 lg:bottom-12 lg:right-[10%] lg:h-24 lg:w-24",
  },
] as const;

/** Drawn at 2× the largest CSS size, so it stays crisp on a retina screen. */
const DRAW_PX = 192;

export function QuoteStickers({ locale }: { locale: "fr" | "en" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STICKERS.map((sticker) => (
        <StickerCanvas
          key={sticker.id}
          id={sticker.id}
          tilt={sticker.tilt}
          locale={locale}
          className={sticker.className}
        />
      ))}
    </div>
  );
}

function StickerCanvas({
  id,
  tilt,
  locale,
  className,
}: {
  id: string;
  tilt: number;
  locale: "fr" | "en";
  className: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawStickerPreview(canvas, id, locale, DRAW_PX);
    draw();
    void document.fonts?.ready.then(draw);
  }, [id, locale]);

  return (
    <canvas
      ref={ref}
      data-quote-sticker={id}
      className={`absolute ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    />
  );
}
