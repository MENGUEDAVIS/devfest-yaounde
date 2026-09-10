/**
 * Where the hero's stickers land, and how far away they are.
 *
 * ## Random, but not random across the whole screen
 *
 * A scatter that can put anything anywhere will eventually put a coffee cup on
 * top of "Grab your ticket" — and on a page that re-rolls every load,
 * "eventually" is some visitor's first impression. The hand-placed cluster
 * this replaces did exactly that on a phone before it was caught.
 *
 * So the randomness is bounded by ZONES: rectangles, in percentages of the
 * hero, that are known to be free of copy at that breakpoint. A sticker picks
 * a zone, then a point inside it. Everything else — which sticker, how big,
 * which way up, how far away — is free.
 *
 * The two breakpoints get their own maps rather than one scaled map, because
 * the phone stacks what the desktop puts side by side: the middle of a desktop
 * hero is open space, and the middle of a mobile one is the CTA buttons.
 *
 * ## Depth is two things that must agree
 *
 * A near sticker is big, sharp, and leans a long way with the pointer. A far
 * one is small, soft, and barely moves. Picking those independently is what
 * makes fake depth of field read as an effect rather than as distance, so a
 * tier decides all four together.
 */

/** Sticker ids from `src/lib/dp/stickers.ts` that read well at hero scale. */
const POOL = [
  "bolt",
  "spark",
  "code",
  "bubble",
  "terminal",
  "cup",
  "pin",
  "burst",
  "bug",
  "cloud",
  "flame",
  "droid",
  "mark",
] as const;

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Zones over the wordmark render in front of it; the rest sit behind. */
  layer: "behind" | "front";
}

/**
 * A ZONE BOUNDS THE STICKER'S TOP-LEFT CORNER, and the sticker then extends
 * right and down from it by its own size. That is easy to forget and it
 * showed: a zone whose right edge merely touched the tagline still put a
 * pin on top of the words, because the sticker started inside the zone and
 * finished well outside it.
 *
 * So every zone below is pre-shrunk by roughly one large sticker — about 8%
 * of the width and 13% of the height at a 1440×900 window — and the comments
 * name the content each one keeps clear of.
 */

/**
 * Desktop, from measured boxes rather than guesses: at 1440×900 the tagline
 * and CTAs occupy x≥71% from y 24%, the figures sit bottom-right from y 85%,
 * the wordmark spans x 3%–57% from y 61%, and the label is just above it.
 */
export const DESKTOP_ZONES: Zone[] = [
  // Under the chrome, well left of the tagline.
  { x: 5, y: 17, w: 50, h: 10, layer: "front" },
  // The large empty middle-left, stopping short of the wordmark's top.
  { x: 4, y: 31, w: 24, h: 14, layer: "front" },
  // Centre, in the gap between the two columns.
  { x: 36, y: 20, w: 24, h: 25, layer: "front" },
  // Bleeding off the right edge, below the CTAs and above the figures.
  { x: 88, y: 42, w: 9, h: 22, layer: "front" },
  // Over the wordmark — sparse and deliberate, clear of the figures.
  { x: 28, y: 64, w: 27, h: 16, layer: "front" },
  // Behind the wordmark, so an edge peeks out past a letter.
  { x: 18, y: 62, w: 34, h: 16, layer: "behind" },
];

/**
 * Mobile, and there is very little room.
 *
 * Measured at 390×844: chrome ends at 17%, tagline 24–34%, the two buttons
 * 38–53%, the label 67–70%, the wordmark 72–86%, the figures 92–98%. The band
 * above the tagline is seven percent tall and a sticker is ten — which is how
 * one ended up tucked behind the navbar.
 *
 * So the phone gets three zones and three stickers rather than a cluster: the
 * margin beside the buttons, the margin beside the wordmark, and one
 * deliberately ON the wordmark. A sparse scatter on a small screen is the
 * right answer anyway — the same density that reads as playful on a desktop
 * reads as clutter on a phone.
 */
export const MOBILE_ZONES: Zone[] = [
  // The right margin the buttons do not reach.
  { x: 64, y: 34, w: 22, h: 12, layer: "front" },
  // Right of the wordmark, which ends around x 75%.
  { x: 74, y: 68, w: 16, h: 12, layer: "front" },
  // On the wordmark, in front — the same deliberate overlap the desktop has.
  { x: 22, y: 74, w: 32, h: 6, layer: "front" },
];

interface Tier {
  size: [number, number];
  blur: [number, number];
  depth: [number, number];
  weight: number;
}

/** Near things are big, sharp and lean far. Far things are the opposite. */
const TIERS: Tier[] = [
  { size: [86, 118], blur: [0, 0], depth: [22, 30], weight: 3 },
  { size: [66, 92], blur: [0.8, 1.6], depth: [12, 18], weight: 3 },
  { size: [52, 76], blur: [2.2, 3.4], depth: [5, 10], weight: 2 },
];

export interface PlacedSticker {
  /** Unique within one scatter — React's key, and never the sticker's id. */
  key: string;
  id: string;
  left: number;
  top: number;
  size: number;
  tilt: number;
  depth: number;
  blur: number;
  layer: "behind" | "front";
  bob: number;
  bobDur: number;
  bobDelay: number;
  settle: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function pickTier(): Tier {
  const total = TIERS.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const tier of TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return TIERS[0];
}

/**
 * One scatter. Sampled WITHOUT replacement, so the same sticker cannot appear
 * twice in one hero — which is both a nicer picture and the reason the keys
 * below cannot collide.
 */
export function pickStickers(mobile: boolean): PlacedSticker[] {
  const zones = mobile ? MOBILE_ZONES : DESKTOP_ZONES;
  const count = mobile ? 3 : randInt(6, 8);

  const bag = [...POOL];
  const placed: PlacedSticker[] = [];

  /*
    One sticker per zone, in a shuffled zone order, until the count is met.
    Cycling zones rather than picking freely stops a roll from stacking four
    stickers into one corner and leaving the rest of the frame bare — the
    scatter should look scattered every time, not just on average.
  */
  const order = [...zones].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count && bag.length > 0; i += 1) {
    const zone = order[i % order.length];
    const tier = pickTier();
    const id = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];

    placed.push({
      key: `${id}-${i}`,
      id,
      left: rand(zone.x, zone.x + zone.w),
      top: rand(zone.y, zone.y + zone.h),
      size: Math.round(rand(tier.size[0], tier.size[1]) * (mobile ? 0.72 : 1)),
      tilt: rand(-22, 22),
      depth: Math.round(rand(tier.depth[0], tier.depth[1])),
      blur: Number(rand(tier.blur[0], tier.blur[1]).toFixed(2)),
      layer: zone.layer,
      bob: -Math.round(rand(6, 15)),
      bobDur: Number(rand(9, 15).toFixed(1)),
      bobDelay: Math.round(rand(0, 2600)),
      /* Staggered in, so the cluster arrives rather than appearing. */
      settle: 420 + i * 90,
    });
  }

  return placed;
}
