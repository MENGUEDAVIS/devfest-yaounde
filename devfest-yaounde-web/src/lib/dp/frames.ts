/**
 * DP generator — frame catalog.
 *
 * A frame is DATA, not code: colours, a mask shape, and a list of decorations
 * the compositor knows how to draw. Adding one for next year's edition is an
 * entry in `DP_FRAMES` and nothing else — no new drawing code, no touched
 * component. See docs/guides/dp-generator.md.
 *
 * Colours come from DESIGN.md §2 (the four Google families, their halftones
 * and pastels). Every fill is FLAT (§2.6); the card's art is built from solid
 * shapes rather than shading.
 *
 * On the mask shape: PAGES.md §9 asks for the morphed-shape motif, and
 * DESIGN.md §4.2 carries a standing instruction not to fake it until the real
 * asset is supplied. `mask` is therefore still limited to honest shapes, and
 * the union mask can be added here later without touching any caller
 * (GAPS.md G17).
 */

export type DpMask = "rounded" | "circle";

/**
 * The decoration vocabulary. Each is a drawing primitive in `compose.ts` that
 * reads its colours from the frame, so any frame can use any of them and a
 * new combination costs one line.
 *
 * `confetti`  — flat shapes scattered in the margin, never over the photo
 * `brackets`  — the DevFest angle-bracket motif, in opposite corners
 * `halftone`  — a dot field that thins out as it crosses the card (§2.4)
 * `sparkles`  — small four-point stars
 * `stripes`   — a diagonal band along one edge
 * `tape`      — two strips of tape holding the photo down, photobooth-style
 * `dashRing`  — a dashed outline offset outside the photo
 * `postcard`  — a thick inner border, like a print with a white margin
 */
export type DpDecoration =
  | "confetti"
  | "brackets"
  | "halftone"
  | "sparkles"
  | "stripes"
  | "tape"
  | "dashRing"
  | "postcard";

export interface DpFrame {
  id: string;
  /** Shown in the picker. Both languages, per the i18n rule. */
  label: { fr: string; en: string };
  /** Card background behind everything. */
  background: string;
  /** The ring around the photo, and most decoration art. */
  accent: string;
  /** Nickname and wordmark colour. */
  foreground: string;
  mask: DpMask;
  /** Drawn under and around the photo, in the order given. */
  decorations: DpDecoration[];
  /**
   * Extra colours for `confetti` and `sparkles`. Defaults to the accent
   * alone. Frames that use all four Google families do it deliberately —
   * that palette IS the brand's own, not four competing dominants.
   */
  palette?: string[];
  /** [shadow, highlight] for the duotone effect. Defaults to ink → accent. */
  duotone?: [string, string];
}

const INK = "#1E1E1E";
const PAPER = "#F0F0F0";
const YELLOW = "#F9AB00";
const YELLOW_LIGHT = "#FFD427";
const YELLOW_PASTEL = "#FFE7A5";
const BLUE = "#4285F4";
const BLUE_LIGHT = "#57CAFF";
const BLUE_PASTEL = "#C3ECF6";
const GREEN = "#34A853";
const GREEN_LIGHT = "#5CDB6D";
const GREEN_PASTEL = "#CCF6C5";
const RED = "#EA4335";
const RED_LIGHT = "#FF7DAF";
const RED_PASTEL = "#F8D8D8";

/** The four families together — the DevFest/Google mark's own palette. */
const BRAND_FOUR = [YELLOW, BLUE, GREEN, RED];

export const DP_FRAMES: DpFrame[] = [
  {
    id: "confetti",
    label: { fr: "Confettis", en: "Confetti" },
    background: YELLOW_PASTEL,
    accent: YELLOW,
    foreground: INK,
    mask: "rounded",
    decorations: ["confetti", "sparkles"],
    palette: BRAND_FOUR,
  },
  {
    id: "brackets",
    label: { fr: "Chevrons", en: "Brackets" },
    background: PAPER,
    accent: INK,
    foreground: INK,
    mask: "rounded",
    decorations: ["brackets", "dashRing"],
    palette: [YELLOW, INK],
    duotone: [INK, YELLOW_LIGHT],
  },
  {
    id: "midnight",
    label: { fr: "Minuit", en: "Midnight" },
    background: INK,
    accent: YELLOW_LIGHT,
    foreground: PAPER,
    mask: "rounded",
    decorations: ["halftone", "sparkles"],
    palette: [YELLOW_LIGHT, PAPER],
    duotone: [INK, YELLOW_LIGHT],
  },
  {
    id: "polaroid",
    label: { fr: "Polaroïd", en: "Polaroid" },
    background: PAPER,
    accent: INK,
    foreground: INK,
    mask: "rounded",
    decorations: ["postcard", "tape"],
    palette: [YELLOW, RED],
    duotone: [INK, PAPER],
  },
  {
    id: "lagoon",
    label: { fr: "Lagune", en: "Lagoon" },
    background: BLUE_PASTEL,
    accent: BLUE,
    foreground: INK,
    mask: "circle",
    decorations: ["stripes", "halftone"],
    palette: [BLUE, BLUE_LIGHT],
    duotone: [INK, BLUE_LIGHT],
  },
  {
    id: "grove",
    label: { fr: "Bosquet", en: "Grove" },
    background: GREEN_PASTEL,
    accent: GREEN,
    foreground: INK,
    mask: "circle",
    decorations: ["confetti", "dashRing"],
    palette: [GREEN, GREEN_LIGHT, YELLOW],
    duotone: [INK, GREEN_LIGHT],
  },
  {
    id: "hibiscus",
    label: { fr: "Hibiscus", en: "Hibiscus" },
    background: RED_PASTEL,
    accent: RED,
    foreground: INK,
    mask: "rounded",
    decorations: ["stripes", "sparkles"],
    palette: [RED, RED_LIGHT, YELLOW],
    duotone: [INK, RED_LIGHT],
  },
  {
    id: "spotlight",
    label: { fr: "Projecteur", en: "Spotlight" },
    background: YELLOW,
    accent: INK,
    foreground: INK,
    mask: "rounded",
    decorations: ["halftone", "brackets"],
    palette: [INK, YELLOW_LIGHT],
    duotone: [INK, YELLOW_PASTEL],
  },
];

export function findFrame(id: string): DpFrame | undefined {
  return DP_FRAMES.find((frame) => frame.id === id);
}

export const DEFAULT_FRAME_ID = DP_FRAMES[0].id;

/**
 * The sticker that straddles the bottom of the photo.
 *
 * Kept apart from the frames on purpose: any tag works with any frame, so
 * folding them together would multiply the catalog for no gain. `none` is
 * first because most people want their face and their name, not a role.
 *
 * The French wording avoids gendered job nouns rather than reaching for a
 * midpoint — "Au micro" and "Dans l'équipe" say the same thing and read like
 * the rest of the site's voice.
 */
export interface DpTag {
  id: string;
  label: { fr: string; en: string };
  /** Empty for `none`; what actually gets printed otherwise. */
  text: { fr: string; en: string };
}

export const DP_TAGS: DpTag[] = [
  {
    id: "none",
    label: { fr: "Aucun", en: "None" },
    text: { fr: "", en: "" },
  },
  {
    id: "attending",
    label: { fr: "J'y serai", en: "I'll be there" },
    text: { fr: "J'Y SERAI", en: "I'LL BE THERE" },
  },
  {
    id: "speaker",
    label: { fr: "Au micro", en: "Speaker" },
    text: { fr: "AU MICRO", en: "SPEAKER" },
  },
  {
    id: "organiser",
    label: { fr: "Dans l'équipe", en: "Organiser" },
    text: { fr: "DANS L'ÉQUIPE", en: "ORGANISER" },
  },
  {
    id: "volunteer",
    label: { fr: "Bénévole", en: "Volunteer" },
    text: { fr: "BÉNÉVOLE", en: "VOLUNTEER" },
  },
];

export const DEFAULT_TAG_ID = DP_TAGS[0].id;

export function findTag(id: string): DpTag | undefined {
  return DP_TAGS.find((tag) => tag.id === id);
}
