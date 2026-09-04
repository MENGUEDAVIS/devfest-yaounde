/**
 * The canonical origin. Everything that has to name the site — canonical
 * tags, hreflang alternates, OG/Twitter URLs, the sitemap, robots.txt and the
 * DP generator's share caption — reads it from here, so the domain is one
 * edit rather than a hunt through metadata blocks.
 *
 * The env var still wins, because a preview deployment should describe
 * itself; the constant is the fallback and the production answer.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://devfest.gdgyaounde.com";

/** The same origin without its scheme — for copy that shows a URL to a human. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(
  /\/$/,
  "",
);

/**
 * Is this URL a stand-in rather than a real destination?
 *
 * Placeholders are written as `"#"` while the real address is unknown. An
 * anchor pointing at one is worse than no anchor: it does nothing when
 * clicked, and a crawler counts it as a link that goes nowhere — the single
 * biggest SEO defect on the site before this, at 164 dead anchors across 18
 * pages, almost all of them speaker and team profiles.
 *
 * So the rule is: **never render a link to a placeholder.** Either leave the
 * item out (an icon nobody can use) or render the label as plain text (a
 * legal page people expect to see named).
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  return (
    !url || url === "#" || url.trim() === "" || url.startsWith("javascript:")
  );
}

/**
 * Placeholder external links for global chrome. None of these have been
 * supplied yet — replace with the real URLs before launch. Centralized here
 * so they're a one-line edit instead of a hunt through JSX.
 * See docs/guides/updating-global-chrome.md.
 */
/**
 * The chapter's event page. The free (HAIKYU) pass is an RSVP there rather
 * than a purchase here — the platform already enforces one free RSVP per
 * person, which is the reason that tier is not sold on this site.
 */
/** Chapter inbox — wall takedowns go here, not a button on the card. */
export const CHAPTER_EMAIL = "gdgyaounde@gmail.com";

export const BEVY_URL =
  "https://gdg.community.dev/events/details/google-gdg-yaounde-presents-devfest-yaounde-2026/cohost-gdg-yaounde/";

export const SOCIAL_LINKS = {
  x: "#",
  instagram: "#",
  whatsapp: "#",
  linkedin: "#",
  youtube: "#",
  facebook: "#",
}; // TODO: real DevFest Yaoundé social profile URLs

/**
 * Privacy Policy and Code of Conduct are referenced by PAGES.md §1.3 but
 * aren't in the sitemap (PAGES.md §0) — no route exists for them yet. Kept
 * as "#" placeholders until that's resolved (new routes vs. external docs).
 */
/** Last edition's recap post or album. Not published yet. */
export const RECAP_URL = "#";

export const PRIVACY_POLICY_URL = "#";
export const CODE_OF_CONDUCT_URL = "#";
