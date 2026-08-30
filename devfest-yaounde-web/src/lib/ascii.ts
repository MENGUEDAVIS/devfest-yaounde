/**
 * A tiny 5-row ASCII display font — PHASE10 §10's headline easter egg.
 *
 * Hand-authored rather than pulled from a figlet package: this is ~40 lines
 * of data for one decorative moment, and a font/banner dependency would have
 * needed an ADR (plus a runtime, plus a font file) to render seven letters.
 *
 * Every glyph is exactly 5 rows tall and self-padded to a fixed width, so
 * rows can be concatenated without any measuring or alignment pass.
 */
const GLYPHS: Record<string, string[]> = {
  A: ["  ██  ", " ████ ", "██  ██", "██████", "██  ██"],
  B: ["█████ ", "██  ██", "█████ ", "██  ██", "█████ "],
  C: [" █████", "██    ", "██    ", "██    ", " █████"],
  D: ["█████ ", "██  ██", "██  ██", "██  ██", "█████ "],
  E: ["██████", "██    ", "█████ ", "██    ", "██████"],
  F: ["██████", "██    ", "█████ ", "██    ", "██    "],
  G: [" █████", "██    ", "██ ███", "██  ██", " █████"],
  H: ["██  ██", "██  ██", "██████", "██  ██", "██  ██"],
  I: ["██████", "  ██  ", "  ██  ", "  ██  ", "██████"],
  J: ["██████", "    ██", "    ██", "██  ██", " ████ "],
  K: ["██  ██", "██ ██ ", "████  ", "██ ██ ", "██  ██"],
  L: ["██    ", "██    ", "██    ", "██    ", "██████"],
  M: ["██   ██", "███ ███", "██ █ ██", "██   ██", "██   ██"],
  N: ["██  ██", "███ ██", "██████", "██ ███", "██  ██"],
  O: [" ████ ", "██  ██", "██  ██", "██  ██", " ████ "],
  P: ["█████ ", "██  ██", "█████ ", "██    ", "██    "],
  Q: [" ████ ", "██  ██", "██  ██", "██ ██ ", " ████ "],
  R: ["█████ ", "██  ██", "█████ ", "██ ██ ", "██  ██"],
  S: [" █████", "██    ", " ████ ", "    ██", "█████ "],
  T: ["██████", "  ██  ", "  ██  ", "  ██  ", "  ██  "],
  U: ["██  ██", "██  ██", "██  ██", "██  ██", " ████ "],
  V: ["██  ██", "██  ██", "██  ██", " ████ ", "  ██  "],
  W: ["██   ██", "██   ██", "██ █ ██", "███ ███", "██   ██"],
  X: ["██  ██", " ████ ", "  ██  ", " ████ ", "██  ██"],
  Y: ["██  ██", " ████ ", "  ██  ", "  ██  ", "  ██  "],
  Z: ["██████", "   ██ ", "  ██  ", " ██   ", "██████"],
  "0": [" ████ ", "██  ██", "██  ██", "██  ██", " ████ "],
  "1": ["  ██  ", " ███  ", "  ██  ", "  ██  ", "██████"],
  "2": [" ████ ", "██  ██", "   ██ ", " ██   ", "██████"],
  "3": ["█████ ", "    ██", " ████ ", "    ██", "█████ "],
  "4": ["██  ██", "██  ██", "██████", "    ██", "    ██"],
  "5": ["██████", "██    ", "█████ ", "    ██", "█████ "],
  "6": [" ████ ", "██    ", "█████ ", "██  ██", " ████ "],
  "7": ["██████", "    ██", "   ██ ", "  ██  ", "  ██  "],
  "8": [" ████ ", "██  ██", " ████ ", "██  ██", " ████ "],
  "9": [" ████ ", "██  ██", " █████", "    ██", " ████ "],
  " ": ["   ", "   ", "   ", "   ", "   "],
};

const ROWS = 5;

/**
 * Render a string as 5 lines of ASCII block letters.
 *
 * Unsupported characters (accents, punctuation) fall back to a space rather
 * than throwing or dropping the glyph, so "Yaoundé" degrades to "YAOUND "
 * instead of breaking the banner's alignment. Accented capitals have no
 * glyph here on purpose — stripping the accent would silently misspell the
 * city's name, and a blank is honestly blank.
 */
export function toAsciiBanner(text: string, gap = " "): string {
  const chars = [...text.toUpperCase()];
  const lines: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    lines.push(
      chars
        .map((c) => (GLYPHS[c] ?? GLYPHS[" "])[row])
        .join(gap)
        .trimEnd(),
    );
  }
  return lines.join("\n");
}
