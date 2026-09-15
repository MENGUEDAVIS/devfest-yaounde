"use client";

import { useEffect, useRef, useState } from "react";
import { drawStickerPreview } from "@/lib/dp/compose";
import {
  pickQuoteStickers,
  type PlacedQuoteSticker,
} from "@/lib/quote-stickers";

/**
 * Four stickers around "What people are saying" — a different four on every
 * page load (PHASE21 §B3, extended by a follow-up request for a 4th and for
 * randomness rather than the original fixed three).
 *
 * THE ARTWORK IS THE DP GENERATOR'S, drawn by the same `drawStickerPreview`
 * the hero uses — no second copy of any sticker.
 *
 * WHICH ONES. Warm, people-flavoured marks rather than tech mascots:
 *   - `bubble`   — a speech bubble; literally people saying things.
 *   - `spark`    — small and warm, a flourish rather than a subject.
 *   - `cup`      — the coffee line, where one of these quotes says a
 *                  co-founder was found. The hallway, not the stage.
 *   - `heart`    — drawn for this section (`src/lib/dp/stickers.ts`); there
 *                  was no heart in the sheet before.
 *   - `thumbsup` — also drawn for this section, for the same reason.
 * Text stickers stay ruled out: at this size the preview draws only their
 * first word, so "See you there" would read as a bare "See".
 *
 * WHICH FOUR, EACH LOAD. `pickQuoteStickers()` shuffles the five above and
 * assigns four of them, one per corner, without repeats — see
 * `src/lib/quote-stickers.ts`. Computed in an EFFECT, not during render:
 * `Math.random()` in the render body is a hydration mismatch waiting to
 * happen — the server picks one assignment, the browser picks another, and
 * React finds two different trees. Rendering nothing until mount (same
 * pattern as `HeroStickers`) means the static prerender is one page for
 * every visitor and the variety happens in the browser.
 *
 * WHERE. Four fixed, pre-measured corners — not a free scatter, unlike the
 * hero — in the section's top and bottom PADDING BANDS: 96px on a phone,
 * 160px from `lg`, which hold no copy at any breakpoint or in either
 * locale. Side margins were rejected: at 1024px the 4xl text column leaves
 * ~64px each side, not enough for a sticker to clear a long French quote.
 * Each corner's size is chosen to finish inside its band. Measured, not
 * eyeballed: at every width from 360 to 1920px, in both locales and for
 * every quote, no sticker box intersects any copy or the dot controls —
 * re-verified after adding the 4th corner, which is new geometry the
 * original 3-sticker version never had to clear.
 *
 * FLAT, deliberately: no blur, no parallax, no bob — this section is for
 * reading. A per-load tilt (within a small, per-corner range) is the only
 * "life", so there is nothing here for reduced motion to switch off.
 * Decorative, so `aria-hidden` and inert.
 *
 * DENSITY: two on a phone (the two larger corners), four from `sm` — the
 * same taper the original had, extended to the new corner.
 */
const DRAW_PX = 192;

export function QuoteStickers({ locale }: { locale: "fr" | "en" }) {
  const [placed, setPlaced] = useState<PlacedQuoteSticker[] | null>(null);

  useEffect(() => {
    // Next tick, not the effect body — a synchronous `setState` here is
    // exactly what `react-hooks/set-state-in-effect` refuses, and the
    // stickers arrive with their own fade-in anyway (same pattern as
    // `HeroStickers`), so one tick later is invisible.
    const id = window.setTimeout(() => setPlaced(pickQuoteStickers()), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!placed) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {placed.map((sticker) => (
        <StickerCanvas
          key={sticker.slotKey}
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
