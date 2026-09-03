/**
 * PLACEHOLDER cards for the community wall.
 *
 * These are not real people and not real submissions. They exist so the wall
 * can be built, reviewed and judged before anyone's face is on it — the page
 * shows them only when the real wall is switched off, and says on screen that
 * they are stand-ins.
 *
 * The shape is deliberately identical to what `GET /api/dp/gallery` returns
 * (`id`, `nickname`, `imageUrl`), so the wall renders both through one path
 * and there is no second code path to keep correct.
 */
export interface WallCard {
  id: string;
  nickname: string;
  imageUrl: string;
  /**
   * The card's shape. The DP generator makes both, so a wall of nothing but
   * squares would be a wall of a thing that does not exist — and the ragged
   * column edges are half of why masonry reads as a wall rather than a grid.
   */
  ratio?: "1:1" | "3:4";
}

/** Invented names, clearly not attributable to anyone. */
const NAMES = [
  "Ada N.",
  "Kwame B.",
  "Amara O.",
  "Yusuf M.",
  "Ngozi T.",
  "Tendai R.",
  "Fatou S.",
  "Emeka D.",
  "Zola K.",
  "Idris A.",
  "Nadia L.",
  "Kofi E.",
  "Aisha P.",
  "Bilal H.",
  "Chidi U.",
  "Dalia W.",
  "Eshe V.",
  "Farai G.",
  "Hawa J.",
  "Imani C.",
  "Jabari F.",
  "Kesse Y.",
  "Lulu Q.",
  "Musa Z.",
];

const PHOTOS = [
  "/placeholders/speaker-1.svg",
  "/placeholders/speaker-2.svg",
  "/placeholders/speaker-3.svg",
  "/placeholders/speaker-4.svg",
  "/placeholders/speaker-5.svg",
  "/placeholders/speaker-6.svg",
];

export const WALL_PLACEHOLDERS: WallCard[] = NAMES.map((nickname, i) => ({
  id: `placeholder-${i}`,
  nickname,
  imageUrl: PHOTOS[i % PHOTOS.length],
  // Roughly a third tall, in no repeating pattern down any one column.
  ratio: i % 3 === 1 ? "3:4" : "1:1",
}));
