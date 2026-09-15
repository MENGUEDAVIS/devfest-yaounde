/**
 * Which sticker lands in which corner of "What people are saying" — a
 * different four on every page load (PHASE21 follow-up to §B3/ADR 0056).
 *
 * Same shape as `hero-stickers.ts`'s scatter, deliberately smaller: FOUR
 * FIXED, PRE-MEASURED SLOTS (not a free scatter) rather than random x/y —
 * this section's slots sit in padding bands verified clear of every quote's
 * text at every width from 360–1920px (see `QuoteStickers.tsx`), and a free
 * scatter would have to re-earn that guarantee on every load instead of
 * once. What IS random each load is which sticker occupies which slot, and
 * each one's exact tilt within a small range — sampled WITHOUT replacement,
 * so the same glyph can never appear twice at once.
 */
import { rand, shuffled } from "./random";

/** Warm, people-flavoured marks — no tech mascots here (see the component). */
export const QUOTE_STICKER_POOL = [
  "bubble",
  "spark",
  "cup",
  "heart",
  "thumbsup",
] as const;

export interface QuoteSlot {
  key: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  /** Tailwind position + size, already verified clear at every breakpoint. */
  className: string;
  /** Degrees; a per-slot range keeps the lean reading as intentional. */
  tiltRange: [number, number];
}

export const QUOTE_SLOTS: QuoteSlot[] = [
  {
    key: "topLeft",
    className:
      "left-[5%] top-4 h-14 w-14 sm:left-[7%] sm:top-5 sm:h-16 sm:w-16 lg:left-[9%] lg:top-7 lg:h-24 lg:w-24",
    tiltRange: [-16, -4],
  },
  {
    key: "bottomRight",
    className:
      "bottom-4 right-[6%] h-14 w-14 sm:bottom-8 sm:right-[8%] sm:h-20 sm:w-20 lg:bottom-12 lg:right-[10%] lg:h-24 lg:w-24",
    tiltRange: [2, 14],
  },
  /*
    The two SMALLER "accent" corners — flourishes rather than subjects, and
    `sm:`-only for the same reason `spark` originally was: this codebase's
    own measurements found a phone has room for two corners at this size,
    not four, before a sticker starts crowding a long French quote.
  */
  {
    key: "topRight",
    className:
      "hidden right-[10%] top-12 h-10 w-10 sm:block sm:h-12 sm:w-12 lg:right-[15%] lg:top-16 lg:h-14 lg:w-14",
    tiltRange: [8, 20],
  },
  {
    key: "bottomLeft",
    className:
      "hidden left-[6%] bottom-10 h-10 w-10 sm:block sm:bottom-14 sm:h-12 sm:w-12 lg:left-[9%] lg:bottom-20 lg:h-14 lg:w-14",
    tiltRange: [-20, -8],
  },
];

export interface PlacedQuoteSticker {
  slotKey: QuoteSlot["key"];
  id: (typeof QUOTE_STICKER_POOL)[number];
  className: string;
  tilt: number;
}

/**
 * One assignment: every slot gets a sticker, no sticker repeats. The pool
 * and the slot list are the same length by construction — this still
 * defends itself with `Math.min` rather than assuming that stays true the
 * next time either list changes.
 */
export function pickQuoteStickers(): PlacedQuoteSticker[] {
  const bag = shuffled(QUOTE_STICKER_POOL);
  const count = Math.min(bag.length, QUOTE_SLOTS.length);

  return QUOTE_SLOTS.slice(0, count).map((slot, i) => ({
    slotKey: slot.key,
    id: bag[i],
    className: slot.className,
    tilt: Number(rand(slot.tiltRange[0], slot.tiltRange[1]).toFixed(1)),
  }));
}
