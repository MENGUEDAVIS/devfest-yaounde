import { notFound } from "next/navigation";

/**
 * Everything under a locale that matches no real route.
 *
 * WITHOUT THIS, `[locale]/not-found.tsx` never renders. A segment's
 * `not-found` boundary only catches a `notFound()` thrown INSIDE that
 * segment's tree — a URL that matches no route at all never enters the tree,
 * so Next falls all the way back to the root `app/not-found.tsx`. Verified:
 * /en/definitely-not-a-page served the bilingual root fallback, in French
 * first, to an English visitor.
 *
 * So this catches those paths, enters the locale tree, and throws — which
 * lands on the localised 404 with the site's own chrome around it, and still
 * returns a real 404 status. Real routes take precedence over a catch-all, so
 * nothing else changes.
 */
export default function CatchAllNotFound() {
  notFound();
}
