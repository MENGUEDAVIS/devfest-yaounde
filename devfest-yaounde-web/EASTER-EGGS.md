# Easter Eggs

A changelog of every hidden delight added to the site, so future organizers don't duplicate or accidentally overwrite one. See `DESIGN.md` §6.3 for the philosophy and seed ideas.

Format: one entry per egg — what it is, where it lives, how to trigger it, and which year/PR added it.

## Logo confetti burst

- **What**: clicking the "DevFest Yaoundé" navbar wordmark 6 times within ~1.5 seconds triggers a burst of 12 halftone-colored confetti pieces around the logo.
- **Where**: `src/components/global/Navbar.tsx` (click tracking) + `src/components/global/ConfettiBurst.tsx` (the burst itself, using the `confettiPiece` preset from `src/lib/motion.ts`).
- **How to trigger**: click the logo rapidly, 6+ times, in the navbar (any page).
- **Added**: `feat/global-chrome`, per `PAGES.md` §1.1's seed idea.
- **Still works after PHASE10 §10 made the logo a real link home.** The navbar lives in the layout, so client-side navigation doesn't remount it and the click tally survives the jump — the burst fires as before, you just end up on the home page. Verified on both the home page and an inner page.

## Hero logo bracket split-and-spin

- **What**: the DevFest "><" mark in the hero is built from its two bracket halves as separately animatable pieces. Hovering parts them slightly; **clicking** flings them apart, spins each a full turn in opposite directions, and snaps them back together.
- **Where**: `src/components/brand/DevFestLogo.tsx` (the inlined SVG + click state) with the `df-bracket-spin-left/right` keyframes in `src/app/motion.css`.
- **How to trigger**: click the large logo at the top of the hero (centred above the headline, since the Phase 6 hero redesign). Hover alone gives the smaller parting tease.
- **Added**: `feat/home-polish`, per PHASE5 §1.
- **Note**: the navbar's smaller copy of the mark is intentionally _not_ click-spinnable — that button already owns the confetti easter egg above, and stacking two behaviours on one control would make both feel accidental.

## ASCII headline

- **What**: the Home hero headline flips into an ASCII-art rendering of itself — block letters spelling "DEVFEST 2026" — and flips back.
- **Where**: `src/components/home/AsciiHeadline.tsx` (triggers + state) with the 5-row block font in `src/lib/ascii.ts` and the `df-ascii-in` keyframe in `src/app/motion.css`. Wired in `src/components/home/Hero.tsx`.
- **How to trigger — three different ways, on purpose**, so it's findable by more than one kind of person:
  1. Type `ascii` anywhere on the page (the classic).
  2. Press and hold the headline for ~700ms — the touch route, where there is no keyboard and no hover.
  3. Load `/#ascii` — so it can be shared as a link.
  Escape, the "Back to normal" button, or repeating a trigger flips it back.
- **Added**: PHASE10 §10.
- **Notes**:
  - The banner spells `DevFest <year>`, not the full headline: the block font has no accented glyphs, and banner-ing "Yaoundé" would either misspell the city or leave a hole. The real headline stays in the DOM as an `sr-only` `<h1>` while flipped, so the page's heading never becomes a wall of block characters for a screen reader.
  - The typed trigger ignores keystrokes while a form field is focused — searching the FAQ for a word containing "ascii" shouldn't set off a headline easter egg.
  - Under `prefers-reduced-motion` the egg still fires; it just cuts instead of fading in.
