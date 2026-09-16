// DevFest Yaoundé — offline schedule service worker (PHASE22 §F, ADR 0066)
//
// STRICT ALLOWLIST. Only Schedule, Speakers, Team and FAQs are ever cached,
// in both locales — the eight pathnames in ALLOWED_PATHS below and nothing
// else. Tickets, Shop, checkout, payments, /account and /admin are NEVER
// intercepted by this file: every request to any of them falls straight
// through to the network, exactly as if this service worker did not exist.
// That is not a performance choice to relax later — it is the one thing
// this file must never get wrong. A stale ticket price, a cached checkout
// step, or a payment page served from yesterday is a real-money bug, not a
// rough UX edge, and the only way to guarantee it can't happen is to never
// let those requests reach this file's cache logic AT ALL, rather than
// trust a cache-invalidation rule to catch it later.
//
// Written by hand rather than through a caching library: the exact set of
// cached routes is the entire point, and auditing eight lines of allowlist
// is safer than auditing a general-purpose library's config surface for
// this specific guarantee.

const CACHE_NAME = "devfest-offline-v1";
const LOCALES = ["en", "fr"];
const OFFLINE_PAGES = ["schedule", "speakers", "team", "faqs"];

/** Exact pathnames this worker may ever cache. Nothing else, ever. */
const ALLOWED_PATHS = new Set(
  LOCALES.flatMap((locale) =>
    OFFLINE_PAGES.map((page) => `/${locale}/${page}`),
  ),
);

self.addEventListener("install", () => {
  // Take over immediately rather than waiting for every open tab to close —
  // there is no versioned data here that an old tab could disagree with,
  // only a cache of public pages.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  // Next's own build output — content-hashed filenames, immutable once
  // built. Safe to cache broadly: this is shared code and CSS with no page
  // content or per-visitor data of its own, the same bundle every visitor
  // gets regardless of which page they're on.
  return pathname.startsWith("/_next/static/");
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Serve from cache instantly if there is one, and refresh the cache from
 * the network in the background either way. Offline, the network leg
 * simply fails and the cached copy (if any) is what was already returned.
 *
 * Deliberately NOT cache-first for the four allowed pages: their content
 * (the programme, who's speaking) changes as the event approaches, and an
 * organiser publishing an update should reach anyone with signal on their
 * NEXT visit, not be stuck behind a cache that only ever refreshes when
 * explicitly told to.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    // Let the refresh happen without making this request wait on it.
    network.catch(() => {});
    return cached;
  }
  const fresh = await network;
  return fresh ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never intercept a write, and never intercept a cross-origin request —
  // this file has no business deciding what happens to either.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (ALLOWED_PATHS.has(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Every other request — tickets, shop, checkout, payments, account,
  // admin, every API route, every other page — is left completely alone.
  // No event.respondWith() call means the browser handles it exactly as
  // if this service worker were not installed.
});
