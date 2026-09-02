/**
 * The DevFest "><" mark, as data.
 *
 * The four paths live here rather than inside the React component because
 * the DP generator has to draw the SAME mark onto a canvas, where there is no
 * SVG — `new Path2D(d)` takes exactly these strings. Two copies of a logo is
 * how a brand asset quietly drifts, so there is one.
 *
 * Source: GDG/DevFest brand asset (docs/decisions/0006-logo-assets.md).
 * Left half = red + blue, right half = yellow + green, matching the separate
 * `d-logo-left/right.png` files.
 *
 * Brand-colour note: this mark is legitimately multi-colour because it is the
 * inherited GDG logo. DESIGN.md §2.5's yellow-dominant rule governs OUR
 * surfaces, not the brand mark itself.
 */
export const MARK_VIEWBOX = { width: 159, height: 88 } as const;

export interface MarkPath {
  d: string;
  fill: string;
}

export const MARK_LEFT: MarkPath[] = [
  {
    d: "M46.4571 8.73271L12.7777 31.751C5.72076 36.574 4.11079 45.925 9.18169 52.637L9.20016 52.6614C14.2711 59.3734 24.1026 60.9047 31.1595 56.0816L64.839 33.0634C71.8958 28.2403 73.5058 18.8894 68.4349 12.1774L68.4164 12.1529C63.3455 5.44095 53.514 3.90967 46.4571 8.73271Z",
    fill: "#EA4335",
  },
  {
    d: "M9.20253 35.2563L9.18405 35.2808C4.11315 41.9927 5.72312 51.3437 12.78 56.1668L46.4595 79.185C53.5164 84.0081 63.3479 82.4768 68.4188 75.7648L68.4373 75.7403C73.5082 69.0284 71.8982 59.6774 64.8413 54.8544L31.1618 31.8361C24.1049 27.0131 14.2734 28.5443 9.20253 35.2563Z",
    fill: "#4285F4",
  },
];

export const MARK_RIGHT: MarkPath[] = [
  {
    d: "M127.705 31.8155L94.0254 54.8338C86.9685 59.6568 85.3586 69.0078 90.4295 75.7198L90.4479 75.7442C95.5188 82.4562 105.35 83.9875 112.407 79.1644L146.087 56.1462C153.144 51.3231 154.754 41.9721 149.683 35.2602L149.664 35.2357C144.593 28.5237 134.762 26.9925 127.705 31.8155Z",
    fill: "#F9AB00",
  },
  {
    d: "M90.4456 12.1589L90.4271 12.1834C85.3562 18.8953 86.9662 28.2463 94.0231 33.0693L127.703 56.0876C134.759 60.9106 144.591 59.3794 149.662 52.6674L149.68 52.6429C154.751 45.931 153.141 36.58 146.084 31.7569L112.405 8.73868C105.348 3.91564 95.5165 5.44692 90.4456 12.1589Z",
    fill: "#34A853",
  },
];

export const MARK_PATHS: MarkPath[] = [...MARK_LEFT, ...MARK_RIGHT];
/** The stroke the brand asset carries around every piece, in viewBox units. */
export const MARK_STROKE_WIDTH = 1.7918;
