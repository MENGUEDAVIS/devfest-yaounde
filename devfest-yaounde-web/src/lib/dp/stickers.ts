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

export const TEXT_STICKERS: TextSticker[] = [
  {
    id: "food",
    kind: "text",
    label: { fr: "Le buffet", en: "The food" },
    text: { fr: "JE VIENS POUR LE BUFFET", en: "HERE FOR THE FOOD" },
    fill: YELLOW,
  },
  {
    id: "sideproject",
    kind: "text",
    label: { fr: "Side project", en: "Side project" },
    text: {
      fr: "PARLE-MOI DE MON SIDE PROJECT",
      en: "ASK ME ABOUT MY SIDE PROJECT",
    },
    fill: BLUE,
  },
  {
    id: "first",
    kind: "text",
    label: { fr: "Première fois", en: "First time" },
    text: { fr: "MON PREMIER DEVFEST", en: "MY FIRST DEVFEST" },
    fill: GREEN,
  },
  {
    id: "build",
    kind: "text",
    label: { fr: "On construit", en: "Let's build" },
    text: { fr: "ON CONSTRUIT QUELQUE CHOSE", en: "LET'S BUILD SOMETHING" },
    fill: RED,
  },
  {
    id: "gdg",
    kind: "text",
    label: { fr: "GDG Yaoundé", en: "GDG Yaoundé" },
    text: { fr: "GDG YAOUNDÉ", en: "GDG YAOUNDÉ" },
    fill: PAPER,
  },
  {
    id: "seeyou",
    kind: "text",
    label: { fr: "On s'y voit", en: "See you there" },
    text: { fr: "ON S'Y VOIT", en: "SEE YOU THERE" },
    fill: "#FFD427",
  },
];

export const ALL_STICKERS: Sticker[] = [...SHAPE_STICKERS, ...TEXT_STICKERS];

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
