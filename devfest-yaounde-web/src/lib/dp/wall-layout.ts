/**
 * How cards are dealt into the wall's columns.
 *
 * Extracted from the component so it can be tested, because the version that
 * shipped was wrong in a way that looked plausible in review and obvious on
 * screen: it indexed `cards[(c + i * columnCount) % cards.length]`, which
 * aliases whenever the deck size and the column count share a factor. With
 * three cards in three columns it reduces to `c % 3 === c` — **every column
 * showed one person, repeated down the whole track**.
 */

import type { WallCard } from "@/data/wall-placeholders";

/**
 * A seeded PRNG, because `Math.random()` cannot be used for this.
 *
 * The wall renders on the server as well as in the browser. Shuffling with
 * `Math.random()` would produce two different walls and React would throw a
 * hydration mismatch. Seeding by column index gives an arrangement that is
 * identical across both renders and still unpredictable to a person — which
 * is the point: nobody should be able to work out which column they will
 * turn up in.
 */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function shuffled<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal every column its own shuffle of the whole deck, re-shuffling whenever
 * it runs out, so a short deck repeats in a different order rather than the
 * same one.
 *
 * The seed is the column index ALONE — deliberately not the deck size — so a
 * card arriving does not re-deal the entire wall under the eyes of whoever is
 * watching it.
 */
export function dealColumns(
  cards: WallCard[],
  columnCount: number,
): WallCard[][] {
  const out: WallCard[][] = Array.from({ length: columnCount }, () => []);
  if (cards.length === 0 || columnCount === 0) return out;
  const perColumn = Math.max(6, Math.ceil(18 / columnCount) * 3);
  for (let c = 0; c < columnCount; c++) {
    const rand = seeded((c + 1) * 2654435761);
    while (out[c].length < perColumn) out[c].push(...shuffled(cards, rand));
    out[c].length = perColumn;
  }
  return out;
}
