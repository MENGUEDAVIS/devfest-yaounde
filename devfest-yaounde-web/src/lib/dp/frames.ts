/**
 * DP generator — frame catalog.
 *
 * Colours come from DESIGN.md §2 (Yellow 600 leads, halftones for energy).
 *
 * On the shape: PAGES.md §9 asks for the morphed-shape motif, but DESIGN.md
 * §4.2 carries a standing instruction not to fake it until the real asset is
 * supplied — a clean rounded rectangle or circle beats a broken morph. So
 * `mask` is deliberately limited to honest shapes, and the union mask can be
 * added here later without touching the compositor's callers.
 */

export type DpMask = "rounded" | "circle";

export interface DpFrame {
  id: string;
  /** Shown in the picker. Both languages, per the i18n rule. */
  label: { fr: string; en: string };
  /** Page background behind the photo. */
  background: string;
  /** Ring drawn around the photo. */
  accent: string;
  /** Nickname + wordmark colour. */
  foreground: string;
  mask: DpMask;
}

export const DP_FRAMES: DpFrame[] = [
  {
    id: "sunrise",
    label: { fr: "Lever de soleil", en: "Sunrise" },
    background: "#FFE7A5",
    accent: "#F9AB00",
    foreground: "#1E1E1E",
    mask: "rounded",
  },
  {
    id: "midnight",
    label: { fr: "Minuit", en: "Midnight" },
    background: "#1E1E1E",
    accent: "#FFD427",
    foreground: "#F0F0F0",
    mask: "rounded",
  },
  {
    id: "lagoon",
    label: { fr: "Lagune", en: "Lagoon" },
    background: "#C3ECF6",
    accent: "#4285F4",
    foreground: "#1E1E1E",
    mask: "circle",
  },
  {
    id: "grove",
    label: { fr: "Bosquet", en: "Grove" },
    background: "#CCF6C5",
    accent: "#34A853",
    foreground: "#1E1E1E",
    mask: "circle",
  },
  {
    id: "hibiscus",
    label: { fr: "Hibiscus", en: "Hibiscus" },
    background: "#F8D8D8",
    accent: "#EA4335",
    foreground: "#1E1E1E",
    mask: "rounded",
  },
];

export function findFrame(id: string): DpFrame | undefined {
  return DP_FRAMES.find((frame) => frame.id === id);
}

export const DEFAULT_FRAME_ID = DP_FRAMES[0].id;
