/**
 * Small, pure randomness helpers for the site's decorative scatters —
 * `quote-stickers.ts` uses these; `hero-stickers.ts` predates this file and
 * keeps its own inline `rand`, which this does not touch.
 *
 * Nothing here is cryptographic or seeded — every caller is a purely
 * cosmetic "which sticker, which tilt" choice with no state to reproduce,
 * so plain `Math.random()` is the right tool (contrast `dp/wall-layout.ts`,
 * which DOES need a seeded PRNG because its output has to match on every
 * render of the same wall).
 */

/** A random float in `[min, max)`. */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** A new array, same elements, order shuffled (Fisher–Yates). */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
