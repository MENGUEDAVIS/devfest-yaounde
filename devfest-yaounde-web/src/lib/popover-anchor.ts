/**
 * Which side an expanding card should open toward — PHASE11 §8.
 *
 * The expanded person card is a popover that opens BESIDE its card, so the
 * grid never reflows. A card in the last column has no room to its right, so
 * it opens left instead.
 *
 * Measured in the CLICK HANDLER, deliberately: measuring in an effect would
 * mean a setState in an effect body (the React Compiler lint rejects it, and
 * it would render one frame with the wrong anchor), and measuring during
 * render is not allowed at all. A pointer event is the correct moment — the
 * layout is settled and the user is about to see the result.
 */
export type PopoverSide = "left" | "right";

export function chooseSide(card: Element | null): PopoverSide {
  if (!card) return "right";
  const grid = card.closest<HTMLElement>("[data-card-grid]");
  if (!grid) return "right";

  const cardBox = card.getBoundingClientRect();
  const gridBox = grid.getBoundingClientRect();

  // The popover is one card wide and sits one gap to the side, so opening
  // right needs another card's width plus the gap still inside the grid.
  const gap = parseFloat(getComputedStyle(grid).columnGap || "0") || 0;
  const needed = cardBox.width + gap;

  // A hair of tolerance: sub-pixel grid widths shouldn't flip the anchor.
  return cardBox.right + needed <= gridBox.right + 1 ? "right" : "left";
}
