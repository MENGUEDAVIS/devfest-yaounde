import { isPlaceholderUrl } from "./site-config";

/**
 * Which of a person's profile links are real.
 *
 * ONLY THE DECISION LIVES HERE, not the icons. The team card renders on the
 * server and imports Phosphor from `/dist/ssr`; the slider and the detail
 * panel are client components and import from `@phosphor-icons/react`. That
 * difference is why this list was written twice — and the second copy quietly
 * missed the placeholder filtering when it was added, leaving the only dead
 * anchors left on the site. Sharing the rule and letting each caller attach
 * its own icons fixes both problems at once.
 *
 * Placeholders are dropped rather than rendered: every social URL in
 * `speakers.json` and `team.json` is still `"#"`, which was 150 links to
 * nowhere. The icons appear on their own when real URLs land in the data.
 */
export type SocialKey = "x" | "linkedin" | "website";

export interface PersonSocial {
  key: SocialKey;
  href: string;
  label: string;
}

export interface HasSocial {
  social?: { x?: string; linkedin?: string; website?: string };
}

const ORDER: { key: SocialKey; label: string }[] = [
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
];

export function realSocials(person: HasSocial): PersonSocial[] {
  return ORDER.flatMap(({ key, label }) => {
    const href = person.social?.[key];
    return isPlaceholderUrl(href) ? [] : [{ key, href: href!, label }];
  });
}
