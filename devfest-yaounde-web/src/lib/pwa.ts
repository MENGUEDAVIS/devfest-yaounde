/**
 * The offline-capable pages — TypeScript's copy.
 *
 * `public/sw.js` is a plain static file served as-is, outside the Next.js
 * build pipeline, so it cannot import this — it keeps its OWN copy of the
 * same four names, deliberately, with a comment there pointing back here.
 * Two copies of a short, rarely-changed allowlist is the honest trade for
 * "the service worker has zero build-time dependencies of its own" — the
 * same reasoning `AdminOrders.tsx` already accepts for duplicating
 * `order-lifecycle.ts`'s transition table client-side (PHASE22 §E's own
 * ADR documents the identical trade).
 */
export const OFFLINE_PAGES = ["schedule", "speakers", "team", "faqs"] as const;
