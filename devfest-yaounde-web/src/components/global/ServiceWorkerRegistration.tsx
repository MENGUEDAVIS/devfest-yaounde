"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` — the offline Schedule/Speakers/Team/FAQs cache
 * (PHASE22 §F, ADR 0066).
 *
 * No visual output; this only wires the browser up. Skipped outright in
 * development: `next dev`'s own fast refresh already rewrites `/_next/`
 * asset URLs on every save, and a service worker caching an old build's
 * chunk hashes underneath that is a confusing bug to chase, not a feature
 * worth having on a machine that is never offline anyway. Skipped just as
 * hard when the browser has no `serviceWorker` API at all, rather than
 * letting that throw.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A registration failure must never be a page-breaking error — the
      // site works perfectly well without offline support, it just does
      // not have it.
    });
  }, []);

  return null;
}
