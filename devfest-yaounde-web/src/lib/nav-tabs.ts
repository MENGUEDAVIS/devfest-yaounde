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
 * Hiding a tab hides the LINK, nothing more: the page itself still exists at
 * its URL, and other places that point at it (a home-page button, the footer,
 * a shared link) still work. Taking a page down is a separate decision.
 */

/** The toggleable tabs, in the order they appear in the navbar. */
export const NAV_TAB_KEYS = [
  "schedule",
  "speakers",
  "faqs",
  "team",
  "shop",
  "tickets",
] as const;

export type NavTabKey = (typeof NAV_TAB_KEYS)[number];

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
