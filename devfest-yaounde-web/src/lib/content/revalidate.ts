import "server-only";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import type { CollectionId } from "./schemas";

/**
 * Push a content change out to the public site.
 *
 * WHY THIS EXISTS AT ALL — and it is the bug that made the whole dashboard
 * look broken. Every public page is statically prerendered (`●` in the build
 * output). So a photo uploaded through the admin was written to the database
 * correctly, read back by the admin correctly, and then **never appeared on
 * the site**, because /fr/team is HTML that was generated at build time and
 * has no reason to be generated again.
 *
 * That defeats the entire premise of the content store (ADR 0031): edit the
 * site without a deploy. Without this, every edit needed a deploy.
 *
 * WHY ON-DEMAND AND NOT `export const revalidate = 60`. A time window means
 * an organiser saves, reloads, sees nothing, and cannot tell a slow cache
 * from a failed save — so they save again, and again. Invalidating the exact
 * paths a change touched makes the reload after a save always correct, and
 * costs nothing on every other request: the pages stay static and cheap.
 */

/**
 * Which pages each collection is visible on.
 *
 * Deliberately explicit rather than "revalidate everything". A wrong entry
 * here shows a stale page, which is visible and reported; blanket
 * invalidation would quietly throw away the whole static build on every
 * keystroke-sized edit and nobody would notice until the bill.
 *
 * `/` is the home page, which reads speakers (the lineup or the call for
 * speakers), quotes, FAQs, sponsors and past editions.
 */
const PAGES: Record<CollectionId, string[]> = {
  speakers: ["/", "/speakers"],
  team: ["/team"],
  sessions: ["/schedule"],
  sponsors: ["/"],
  faqs: ["/", "/faqs"],
  products: ["/shop"],
  "ticket-tiers": ["/tickets"],
  quotes: ["/"],
  stats: ["/"],
  "past-editions": ["/"],
};

/** Every locale's copy of a path, since each is prerendered separately. */
function localised(path: string): string[] {
  return routing.locales.map((locale) =>
    path === "/" ? `/${locale}` : `/${locale}${path}`,
  );
}

export function revalidateCollection(id: CollectionId): void {
  // No `?? []` — `PAGES` is keyed by `CollectionId`, so a new collection
  // fails to compile until somebody says where it is shown. That is the
  // point: a missing entry here is a page that silently never updates.
  for (const path of PAGES[id]) {
    for (const full of localised(path)) revalidatePath(full);
  }
}

/**
 * Settings reach the announcement banner, which is in the ROOT LAYOUT — so
 * it is on every page, and every page has to be rebuilt.
 *
 * `revalidatePath(_, "layout")` does exactly that for a subtree, which is why
 * this is not the same shape as the per-collection version above.
 */
export function revalidateSettings(): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`, "layout");
  }
}
