# 0066 — An installable PWA, with offline caching limited to four pages by name

Date: 2026-09-16
Status: Accepted (PHASE22 §F)

## What, and the one rule that matters more than the feature

Schedule, Speakers, Team and FAQs — in both locales, eight exact
pathnames — now work with no connection, once visited once with one. The
site is also genuinely installable: a real service worker with a fetch
handler, a complete manifest (name, colours, a 192px and a 512px icon),
and a visible install affordance.

**The rule the brief actually cared about: Tickets, Shop, checkout,
payments, `/account` and `/admin` are never cached, never served stale,
and never touched by this feature in any way.** Every other design
decision below is secondary to that one holding exactly, always — a
cached checkout step or a stale ticket price is a real-money bug, not UX
polish gone slightly wrong, and the only way to guarantee it can never
happen is to make it structurally impossible rather than carefully
avoided.

## Hand-written, not a caching library

`public/sw.js` is a plain file, no `next-pwa`/Workbox dependency. The
entire feature is an EXACT allowlist of eight pathnames
(`ALLOWED_PATHS`), checked before anything is ever written to the cache:

```js
const ALLOWED_PATHS = new Set(
  LOCALES.flatMap((locale) =>
    OFFLINE_PAGES.map((page) => `/${locale}/${page}`),
  ),
);
```

Auditing eight lines of allowlist by reading them is a stronger guarantee
than auditing a general-purpose caching library's config surface for this
one property. No new dependency, so no ADR debt for one either.

Two strategies, chosen by what's being cached:

- **`/_next/static/*` (Next's own build output)** — cache-first.
  Content-hashed filenames are immutable once built; this is shared code
  and CSS with no page content or per-visitor data of its own, so caching
  it broadly is free and safe.
- **The eight allowed pages** — stale-while-revalidate, deliberately NOT
  cache-first. Their content (the programme, who's speaking) changes as
  the event approaches; an organiser's update should reach anyone with
  signal on their next visit, not sit behind a cache that only refreshes
  when explicitly told to. Offline, the network leg simply fails and
  whatever was cached last is what's returned.
- **Everything else** — GET or not, the fetch handler returns without
  calling `event.respondWith()` at all. That is not "cache it but expire
  it fast" — it is the same as this file not existing for that request.

## The pathname check covers navigation AND client-side flight requests, on purpose

The allowlist matches on `url.pathname` alone, not `request.mode`. An
earlier draft special-cased `request.mode === "navigate"` (a real page
load) separately from the RSC flight fetch Next's App Router issues for
an in-app `<Link>` click — but that would mean offline browsing only
worked for whichever page you happened to load first, not for clicking
between the four allowed pages once inside the installed app. Matching
on pathname alone, and trusting the Cache API's own `Vary`-header
handling (which Next sets on these responses precisely so an HTML
document and its RSC-flight sibling are never confused for one another)
lets both representations of the SAME allowed page cache correctly as
separate entries, with no hand-rolled logic to get subtly wrong.

## Everything not on the list is unreachable by construction, not by care

There is no second check, no "don't cache this" list for money pages —
the allowlist IS the only place a URL is ever compared, and anything not
an exact match falls through with zero special-casing. Verified directly
rather than assumed (see below): visiting `/en/tickets`, `/en/shop`,
`/en/account` and `/en/admin` while the service worker was active and
already caching Schedule left the cache holding `/en/schedule` and
nothing else non-static. Offline, Tickets then fails outright
(`net::ERR_INTERNET_DISCONNECTED`) rather than serving anything.

## An offline indicator that names what still works, not just that something's wrong

`OfflineIndicator.tsx` — a fixed pill, shown only while
`navigator.onLine` is false, tracked via the `online`/`offline` events
rather than polled (the same "trust the event, not a snapshot" rule
`CustomCursor`'s own two hard gates already follow). Its copy names the
four pages that still work (`nav.schedule` etc., reused rather than a new
translation), because "you're offline" alone leaves someone wondering
whether ANYTHING on the site still works — telling them exactly what does
is the more useful message.

## Installability: a real `beforeinstallprompt`-driven button, not just a manifest and a hope

`InstallPrompt.tsx` only ever renders when Chromium has ALREADY decided
the site meets the bar and fired `beforeinstallprompt` — a valid
manifest, HTTPS, and a service worker with a fetch handler. Firefox and
Safari never fire that event; the component simply never appears there,
which is correct, since there is nothing for it to do beyond the
browser's own "Add to Home Screen" menu item. Dismissing it hides it for
the session only (`useSessionDismissed`, the same hook the announcement
banner already uses) — a permanent dismissal would quietly turn it into
dead code the moment someone closed it once, weeks before it would
actually matter to have offline access at the venue.

Two new generated icon routes, `icon-192`/`icon-512`
(`src/lib/brand/app-icon.tsx`, a small shared helper factored out so
three sizes — 180 (Apple), 192, 512 — don't each carry their own copy of
the mark-on-yellow drawing `apple-icon.tsx` already had). Chrome's
installability check wants a raster icon at 192px or larger; `icon.svg`
alone does not satisfy that on every platform.

## A real, pre-existing bug found and fixed along the way

`/apple-icon` had been **silently 404ing since it was added** — nothing
to do with this phase's own changes. `src/proxy.ts`'s matcher excluded
`api`/`auth`/`og`/`trpc`/`_next`/`_vercel` and any path containing a dot,
but `apple-icon` (no dot, lives outside `[locale]` on purpose) was never
in that list, so `next-intl`'s locale routing redirected it to
`/en/apple-icon` or `/fr/apple-icon` — neither of which exists, since the
real route has no locale prefix. Verified directly: before this fix, both
locale-prefixed paths 404 and `curl -I /apple-icon` returns a 307, never
the PNG. The same gap would have caught the two new PWA icon routes too,
so the matcher now excludes all three:

```
"/((?!api|auth|og|apple-icon|icon-192|icon-512|trpc|_next|_vercel|.*\\..*).*)"
```

## Verified

- **The core guarantee, end to end, not assumed**: with the service
  worker active and Schedule already cached, `/en/tickets`, `/en/shop`,
  `/en/account` and `/en/admin` were each visited in turn — the cache
  afterward held exactly `/en/schedule` and nothing else non-static.
  Forcing the browser offline (Chrome DevTools Protocol network
  emulation) and reloading Schedule succeeded from cache; the same
  offline state on `/en/tickets` failed outright
  (`net::ERR_INTERNET_DISCONNECTED`) rather than serving a stale copy.
- The offline indicator screenshotted showing the correct copy
  ("You're offline — Schedule, Speakers, Team, FAQs still work.") once
  the `offline` event fired.
- `icon-192`/`icon-512` fetched directly and confirmed as real PNGs at
  the declared dimensions (`file` reports `192 x 192` / `512 x 512`,
  8-bit RGBA); the manifest response lists all four icons.
- The pre-existing `/apple-icon` bug reproduced before the fix (307 to a
  path that 404s) and confirmed resolved after (direct 200 with the PNG)
  — against a genuinely fresh production build (`next build` +
  `next start`), not only `next dev`.
- `tests/browser/admin.mjs` re-run against that same fresh build: 13/13
  passing, confirming this phase's changes to `proxy.ts`'s matcher did
  not loosen anything the gate suite already checks (the locale redirect
  for ordinary pages, and every organiser-only route, still behave
  exactly as before).
- `npm run verify` (210 tests, lint, typecheck) and `npm run build` pass.

### A verification detour worth recording

Testing this against `next start` initially showed `/apple-icon` and the
new icon routes still redirecting even after the matcher fix, while
`next dev` showed the fix working correctly immediately. Chasing that
gap wasted real time before it resolved: it traced to leftover
`next start` processes from earlier testing in this same session still
bound to the target port and serving a stale pre-fix build, not a defect
in the fix or in Next.js's production build. A fully clean rebuild
against a never-used port confirmed the fix works identically under
`next start` and `next dev`. Recorded here because the failure mode —
"looks like the change had no effect" — is exactly the kind of false
signal worth naming so a future session doesn't repeat the same hour
chasing a ghost.

## Consequences

- Anyone extending the offline set later edits `OFFLINE_PAGES` in
  **two** places by design — `public/sw.js` (plain, unbundled, cannot
  import) and `src/lib/pwa.ts` (the TypeScript side, used by
  `OfflineIndicator`). This mirrors the same accepted trade
  `AdminOrders.tsx` already makes duplicating `order-lifecycle.ts`'s
  transition table client-side (ADR from PHASE22 §E) — the alternative is
  giving the service worker a build step, which is a bigger change for a
  short, rarely-touched list.
- The cache version (`devfest-offline-v1`) is the only thing that needs
  bumping if the caching STRATEGY itself ever changes shape (not for
  ordinary content updates — stale-while-revalidate already refreshes
  those on every online visit) — the `activate` handler deletes any cache
  whose name doesn't match, so a version bump is a clean cutover with no
  manual cleanup step.
- Check-in (`/api/check-in`) remains online-only, unaffected and
  unchanged — it was already documented as needing a connection
  (`docs/guides/check-in-and-orders.md`), and nothing here touches that.
