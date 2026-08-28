# 0006 — DevFest Logo Assets

Date: 2026-08-29
Status: Accepted (with an open follow-up on chapter-specific assets)

## Context

Up to this point the site had no logo at all — the navbar showed a plain text wordmark and the browser tab still carried the default `create-next-app` favicon. PHASE5 §1 supplied three GDG/DevFest brand assets to download from the DevFest Lagos 2025 site:

- `devfest-logo.497c84b3.svg` — the full "><" mark
- `d-logo-left.b54f74d0.png` / `d-logo-right.e4972af6.png` — the two bracket halves as separate rasters

The brief specifically wanted the two halves animated as **separate pieces** (splitting, snapping, reacting on hover), doubling as an easter egg.

## Decision

All three files were downloaded, verified (HTTP 200, correct `Content-Type`, and confirmed by `file` as real SVG/PNG rather than error pages), and committed under `public/logo/`.

**The SVG is what actually drives the UI**, for three reasons:

1. It already contains the two bracket halves as **four separate `<path>` elements** — left half = red + blue, right half = yellow + green — which is exactly the separation the PNGs provide, but vector and individually animatable.
2. Being vector, it stays crisp at every size from the 24px navbar mark to the 48px+ hero mark, and its paths can be transformed independently without raster scaling artifacts.
3. Animating two `<g>` groups inside one inline SVG is simpler and better-performing than positioning and syncing two `<img>` elements.

It is inlined as a React component (`src/components/brand/DevFestLogo.tsx`) rather than referenced via `<img>`, because an `<img>`-referenced SVG's internals can't be animated by the host page.

**Favicon**: the SVG is copied to `src/app/icon.svg`, which Next.js App Router picks up automatically (verified — the build now emits an `/icon.svg` route). The default `create-next-app` `favicon.ico` was **deleted**, because Next.js would otherwise emit both and `/favicon.ico` generally wins in browsers, leaving the stale default in the tab. That file was generated scaffold, not project content.

The two PNG halves are retained in `public/logo/` as the supplied source assets (~3KB each) even though the SVG is what renders. They're the raster fallback if a future context needs one.

## Brand-color note

The mark is legitimately four-colored (red/blue/yellow/green). This is **not** a violation of the yellow-dominant base theme (`DESIGN.md` §2.5 / `0005-base-color-theme.md`): that rule governs _our_ surfaces — backgrounds, CTAs, decorative fills — not the inherited GDG brand mark, which has fixed colors we don't get to restyle. The logo is also small relative to the page, so it reads as a mark rather than as a rainbow section.

The SVG contains no gradients, so it satisfies §2.6 as-is (verified by grep).

## Consequences

- The logo is now used in three places: navbar (small, static, with the existing confetti easter egg), hero (large, animated entrance + hover parting + click-to-spin easter egg), and footer.
- Adding the mark to the navbar made the row wider and **reintroduced the overlap bug** at 1440px — the chrome container had to widen from `max-w-4xl` to `max-w-5xl` and nav gaps tightened. Re-verified clean across 13 widths (320–1920px). Any future navbar addition needs the same sweep.
- A new easter egg (click the hero logo → brackets fling apart, spin, and snap back) is logged in `/EASTER-EGGS.md`.

## Open follow-up — chapter-specific assets

These are the **Lagos chapter's** copies of shared GDG/DevFest brand material. Using them as brand material for another DevFest chapter is fine in principle, but the final assets should ideally come from **GDG Yaoundé's own brand kit**, or from the regional GDG lead, in case the Yaoundé chapter's approved artwork differs (e.g. a chapter lockup with the city name).

This is flagged, not blocking. Swapping them later is a drop-in replacement: overwrite the files in `public/logo/` and `src/app/icon.svg`, and if the path geometry changes, update the four `<path d="...">` values inside `DevFestLogo.tsx`. No call sites change.
