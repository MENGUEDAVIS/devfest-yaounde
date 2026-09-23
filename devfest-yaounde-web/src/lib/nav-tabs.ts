/**
 * Which navbar tabs are shown (PHASE24) — the plain, client-safe half.
 *
 * An organiser can hide or show every tab in the navbar from the dashboard
 * (Config → Navigation) except the language switch, which always stays.
 * Everything here is deliberately free of `server-only` and React so the
 * navbar (a client component), the settings loader, the dashboard screen and
 * the tests can all share ONE definition of what the tabs are and in what
 * order they sit.
 *
 * Hiding a tab hides its LINKS — in the navbar AND in the footer, which
 * repeats the same tabs (Schedule/Speakers/Team/FAQs, Shop, and the Tickets
 * call-to-action button). It does nothing more: the page itself still exists at
 * its URL, and other places that point at it (a home-page button, a shared
 * link) still work. Taking a page down is a separate decision.
 */

/**
 * The toggleable tabs, in the order they appear in the navbar — then the one
 * switch that is FOOTER-ONLY: `dpGenerator`, which governs the DP generator
 * and the community wall together (see `FOOTER_ONLY_KEYS`).
 */
export const NAV_TAB_KEYS = [
  "schedule",
  "speakers",
  "faqs",
  "team",
  "shop",
  "tickets",
  "dpGenerator",
] as const;

export type NavTabKey = (typeof NAV_TAB_KEYS)[number];

/**
 * Switches that have NO navbar link — they only govern footer links.
 *
 * `dpGenerator` is one switch for two pages on purpose: the community wall is
 * where the DP generator's cards end up, so the two go together. Off hides
 * BOTH footer links (DP generator and Community wall); on shows both. There is
 * deliberately no way to show one without the other.
 */
export const FOOTER_ONLY_KEYS = ["dpGenerator"] as const;

/** The switches that also drive a navbar link — everything but the above. */
export const NAVBAR_KEYS = NAV_TAB_KEYS.filter(
  (key) => !(FOOTER_ONLY_KEYS as readonly string[]).includes(key),
);

/** `true` = the tab is shown. */
export type NavSettings = Record<NavTabKey, boolean>;

/** Every tab shown — what the site did before this setting existed. */
export const DEFAULT_NAV: NavSettings = {
  schedule: true,
  speakers: true,
  faqs: true,
  team: true,
  shop: true,
  tickets: true,
  dpGenerator: true,
};

/** The text links in the middle of the bar, and the routes they go to. */
const TEXT_LINKS = [
  { href: "/schedule", key: "schedule" },
  { href: "/speakers", key: "speakers" },
  { href: "/faqs", key: "faqs" },
  { href: "/team", key: "team" },
] as const;

/** The plain text links to render, with hidden ones removed, in order. */
export function visibleTextLinks(nav: NavSettings) {
  return TEXT_LINKS.filter((link) => nav[link.key]);
}
