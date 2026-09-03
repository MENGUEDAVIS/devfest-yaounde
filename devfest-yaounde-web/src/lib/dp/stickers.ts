/**
 * DP generator — the sticker sheet.
 *
 * Two kinds, one look. A `shape` sticker is a vector path drawn in a 100×100
 * box; a `text` sticker is a phrase in a rounded tag. Both get the same
 * treatment in `compose.ts` — a flat ink shadow, a heavy ink outline, a flat
 * fill — because that is what makes a sticker read as a sticker rather than
 * as clip art dropped on a photo.
 *
 * Adding one is an entry in `SHAPE_STICKERS` or `TEXT_STICKERS` and nothing
 * else: the picker, the canvas and the export all read these arrays.
 *
 * On the marks: the DevFest bracket is the project's own, drawn from the
 * shared brand data. Nothing here reproduces a third-party logo — the
 * "community" stickers are GDG Yaoundé's own name and the event's own mark.
 */

export interface ShapeSticker {
  id: string;
  kind: "shape";
  label: { fr: string; en: string };
  /** Path data in a 100×100 box, filled with `fill`. */
  paths: { d: string; fill?: string }[];
  /** Default fill when a path does not name its own. */
  fill: string;
  /** Draw the DevFest mark instead of `paths` — it has its own colours. */
  mark?: boolean;
}

export interface TextSticker {
  id: string;
  kind: "text";
  label: { fr: string; en: string };
  text: { fr: string; en: string };
  fill: string;
}

export type Sticker = ShapeSticker | TextSticker;

const YELLOW = "#F9AB00";
const BLUE = "#4285F4";
const GREEN = "#34A853";
const RED = "#EA4335";
const PAPER = "#F0F0F0";

export const SHAPE_STICKERS: ShapeSticker[] = [
  {
    id: "mark",
    kind: "shape",
    label: { fr: "Le logo", en: "The mark" },
    mark: true,
    paths: [],
    fill: YELLOW,
  },
  {
    id: "bolt",
    kind: "shape",
    label: { fr: "Éclair", en: "Bolt" },
    paths: [{ d: "M58 4 L18 56 H44 L36 96 L84 40 H54 Z" }],
    fill: YELLOW,
  },
  {
    id: "spark",
    kind: "shape",
    label: { fr: "Étincelle", en: "Spark" },
    paths: [
      {
        d: "M50 2 C54 30 70 46 98 50 C70 54 54 70 50 98 C46 70 30 54 2 50 C30 46 46 30 50 2 Z",
      },
    ],
    fill: RED,
  },
  {
    id: "code",
    kind: "shape",
    label: { fr: "Chevrons", en: "Angle brackets" },
    paths: [
      { d: "M34 20 L6 50 L34 80 L46 68 L30 50 L46 32 Z" },
      { d: "M66 20 L94 50 L66 80 L54 68 L70 50 L54 32 Z" },
    ],
    fill: BLUE,
  },
  {
    id: "bubble",
    kind: "shape",
    label: { fr: "Bulle", en: "Speech bubble" },
    paths: [
      {
        d: "M14 10 H86 A14 14 0 0 1 100 24 V62 A14 14 0 0 1 86 76 H46 L22 96 L26 76 H14 A14 14 0 0 1 0 62 V24 A14 14 0 0 1 14 10 Z",
      },
    ],
    fill: PAPER,
  },
  {
    id: "terminal",
    kind: "shape",
    label: { fr: "Terminal", en: "Terminal" },
    paths: [
      {
        d: "M6 12 H94 A10 10 0 0 1 104 22 V78 A10 10 0 0 1 94 88 H6 A10 10 0 0 1 -4 78 V22 A10 10 0 0 1 6 12 Z",
        fill: "#1E1E1E",
      },
      { d: "M22 36 L40 50 L22 64 L16 57 L26 50 L16 43 Z", fill: "#5CDB6D" },
      { d: "M48 60 H80 V68 H48 Z", fill: "#5CDB6D" },
    ],
    fill: "#1E1E1E",
  },
  {
    id: "cup",
    kind: "shape",
    label: { fr: "Café", en: "Coffee" },
    paths: [
      {
        d: "M14 26 H74 V62 A22 22 0 0 1 52 84 H36 A22 22 0 0 1 14 62 Z",
      },
      {
        d: "M74 34 H84 A14 14 0 0 1 84 62 H74 V52 H82 A4 4 0 0 0 82 44 H74 Z",
      },
      {
        d: "M26 4 C34 12 26 16 32 22 H24 C18 14 26 10 20 4 Z",
        fill: "#1E1E1E",
      },
      {
        d: "M46 4 C54 12 46 16 52 22 H44 C38 14 46 10 40 4 Z",
        fill: "#1E1E1E",
      },
    ],
    fill: RED,
  },
  {
    id: "pin",
    kind: "shape",
    label: { fr: "Yaoundé", en: "Yaoundé" },
    paths: [
      {
        d: "M50 2 C28 2 12 19 12 40 C12 66 40 92 50 98 C60 92 88 66 88 40 C88 19 72 2 50 2 Z",
      },
      { d: "M50 24 A16 16 0 1 0 50 56 A16 16 0 1 0 50 24 Z", fill: PAPER },
    ],
    fill: GREEN,
  },
  {
    id: "burst",
    kind: "shape",
    label: { fr: "Explosion", en: "Burst" },
    paths: [
      {
        d: "M50 0 L60 22 L82 12 L76 36 L100 40 L82 54 L98 72 L74 72 L78 96 L58 82 L50 100 L42 82 L22 96 L26 72 L2 72 L18 54 L0 40 L24 36 L18 12 L40 22 Z",
      },
    ],
    fill: YELLOW,
  },
  {
    id: "bug",
    kind: "shape",
    label: { fr: "Le bug", en: "The bug" },
    paths: [
      {
        d: "M18 30 L4 18 M82 30 L96 18 M14 54 H0 M86 54 H100 M18 78 L4 92 M82 78 L96 92",
        fill: "none",
      },
      { d: "M50 14 A34 40 0 1 0 50 94 A34 40 0 1 0 50 14 Z" },
      { d: "M38 40 A5 5 0 1 0 38 50 A5 5 0 1 0 38 40 Z", fill: "#1E1E1E" },
      { d: "M62 40 A5 5 0 1 0 62 50 A5 5 0 1 0 62 40 Z", fill: "#1E1E1E" },
    ],
    fill: "#FF7DAF",
  },
];

/*
 * Stylised nods to the platforms this community actually builds on — a cloud,
 * a flame, a spark, a droid, a phone.
 *
 * DRAWN IN-HOUSE, and deliberately not traced from the official marks. These
 * are Google trademarks; a GDG chapter may use the real assets under the GDG
 * brand guidelines, but an approximation drawn from memory would be both a
 * worse likeness and a worse citizen. If the chapter has the official SVGs and
 * permission to put them on a card people post, swap the `paths` here and
 * nothing else changes. See GAPS.md G18.
 */
export const TECH_STICKERS: ShapeSticker[] = [
  {
    id: "cloud",
    kind: "shape",
    label: { fr: "Cloud", en: "Cloud" },
    fill: BLUE,
    paths: [
      {
        d: "M26 74 A20 20 0 0 1 26 38 A24 24 0 0 1 70 30 A18 18 0 0 1 76 74 Z",
      },
    ],
  },
  {
    id: "flame",
    kind: "shape",
    label: { fr: "Firebase", en: "Firebase" },
    fill: YELLOW,
    paths: [
      // A teardrop with a hot core. The first attempt was two nested
      // diamonds, which read as a gem rather than a flame.
      {
        d: "M50 6 C68 30 82 42 82 60 A32 32 0 0 1 18 60 C18 42 32 30 50 6 Z",
        fill: YELLOW,
      },
      {
        d: "M50 44 C58 56 64 62 64 70 A14 14 0 0 1 36 70 C36 62 42 56 50 44 Z",
        fill: RED,
      },
    ],
  },
  {
    id: "aistudio",
    kind: "shape",
    label: { fr: "AI Studio", en: "AI Studio" },
    fill: BLUE,
    paths: [
      {
        d: "M14 26 H86 A8 8 0 0 1 94 34 V72 A8 8 0 0 1 86 80 H14 A8 8 0 0 1 6 72 V34 A8 8 0 0 1 14 26 Z",
        fill: BLUE,
      },
      {
        d: "M50 36 L56 50 L70 56 L56 62 L50 76 L44 62 L30 56 L44 50 Z",
        fill: PAPER,
      },
    ],
  },
  {
    id: "droid",
    kind: "shape",
    label: { fr: "Android", en: "Android" },
    fill: GREEN,
    paths: [
      { d: "M22 56 A28 28 0 0 1 78 56 Z", fill: GREEN },
      {
        d: "M24 62 H76 V80 A8 8 0 0 1 68 88 H32 A8 8 0 0 1 24 80 Z",
        fill: GREEN,
      },
      { d: "M28 24 L36 36 M72 24 L64 36", fill: "none" },
      { d: "M38 44 a4 4 0 1 0 0.1 0 Z", fill: "#1E1E1E" },
      { d: "M62 44 a4 4 0 1 0 0.1 0 Z", fill: "#1E1E1E" },
    ],
  },
  {
    id: "pixelphone",
    kind: "shape",
    label: { fr: "Pixel", en: "Pixel" },
    fill: PAPER,
    paths: [
      {
        d: "M30 6 H70 A10 10 0 0 1 80 16 V84 A10 10 0 0 1 70 94 H30 A10 10 0 0 1 20 84 V16 A10 10 0 0 1 30 6 Z",
        fill: PAPER,
      },
      { d: "M24 26 H76 V40 H24 Z", fill: "#1E1E1E" },
      { d: "M36 29 a4 4 0 1 0 0.1 0 Z", fill: BLUE },
      { d: "M48 29 a4 4 0 1 0 0.1 0 Z", fill: GREEN },
    ],
  },
];

/*
 * One word, so it fits: a hashtag in UpperCamelCase. French hashtags drop
 * their accents, because that is how people actually type them.
 */
export const TEXT_STICKERS: TextSticker[] = [
  {
    id: "food",
    kind: "text",
    label: { fr: "Le buffet", en: "The food" },
    text: { fr: "#JeViensPourLeBuffet", en: "#HereForTheFood" },
    fill: YELLOW,
  },
  {
    id: "network",
    kind: "text",
    label: { fr: "Réseauter", en: "Networking" },
    text: { fr: "#JeViensReseauter", en: "#GrowMyNetwork" },
    fill: BLUE,
  },
  {
    id: "sideproject",
    kind: "text",
    label: { fr: "Side project", en: "Side project" },
    text: { fr: "#ParleMoiDeMonProjet", en: "#AskMeAboutMySideProject" },
    fill: RED,
  },
  {
    id: "first",
    kind: "text",
    label: { fr: "Première fois", en: "First time" },
    text: { fr: "#MonPremierDevFest", en: "#MyFirstDevFest" },
    fill: GREEN,
  },
  {
    id: "build",
    kind: "text",
    label: { fr: "On construit", en: "Let's build" },
    text: { fr: "#OnConstruitQuelqueChose", en: "#LetsBuildSomething" },
    fill: "#FFD427",
  },
  {
    id: "coffee",
    kind: "text",
    label: { fr: "Café d'abord", en: "Coffee first" },
    text: { fr: "#DAbordLeCafe", en: "#CoffeeFirst" },
    fill: PAPER,
  },
  {
    id: "gdg",
    kind: "text",
    label: { fr: "GDG Yaoundé", en: "GDG Yaoundé" },
    text: { fr: "#GDGYaounde", en: "#GDGYaounde" },
    fill: BLUE,
  },
  {
    id: "seeyou",
    kind: "text",
    label: { fr: "On s'y voit", en: "See you there" },
    text: { fr: "#OnSeVoitLaBas", en: "#SeeYouThere" },
    fill: YELLOW,
  },
];

export const ALL_STICKERS: Sticker[] = [
  ...SHAPE_STICKERS,
  ...TECH_STICKERS,
  ...TEXT_STICKERS,
];

export function findSticker(id: string): Sticker | undefined {
  return ALL_STICKERS.find((s) => s.id === id);
}

/** A sticker actually placed on a card. */
export interface PlacedSticker {
  /** Unique per placement — the same sticker can be dropped twice. */
  key: string;
  stickerId: string;
  /** Centre, in fractions of the card's width and height. */
  x: number;
  y: number;
  /** 1 = the catalog's default size. */
  scale: number;
  /** Radians. */
  rotation: number;
}

export const STICKER_MIN_SCALE = 0.45;
export const STICKER_MAX_SCALE = 2.4;
/** Base size of a shape sticker, as a fraction of the card's short edge. */
export const STICKER_BASE = 0.2;

/** The sticker's own name, for the "selected" readout. */
export function stickerName(id: string, locale: "fr" | "en"): string {
  return findSticker(id)?.label[locale] ?? id;
}
