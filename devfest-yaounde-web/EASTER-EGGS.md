# Easter Eggs

A changelog of every hidden delight added to the site, so future organizers don't duplicate or accidentally overwrite one. See `DESIGN.md` §6.3 for the philosophy and seed ideas.

Format: one entry per egg — what it is, where it lives, how to trigger it, and which year/PR added it.

## Logo confetti burst

- **What**: clicking the "DevFest Yaoundé" navbar wordmark 6 times within ~1.5 seconds triggers a burst of 12 halftone-colored confetti pieces around the logo.
- **Where**: `src/components/global/Navbar.tsx` (click tracking) + `src/components/global/ConfettiBurst.tsx` (the burst itself, using the `confettiPiece` preset from `src/lib/motion.ts`).
- **How to trigger**: click the logo rapidly, 6+ times, in the navbar (any page).
- **Added**: `feat/global-chrome`, per `PAGES.md` §1.1's seed idea.

## Hero logo bracket split-and-spin

- **What**: the DevFest "><" mark in the hero is built from its two bracket halves as separately animatable pieces. Hovering parts them slightly; **clicking** flings them apart, spins each a full turn in opposite directions, and snaps them back together.
- **Where**: `src/components/brand/DevFestLogo.tsx` (the inlined SVG + click state) with the `df-bracket-spin-left/right` keyframes in `src/app/motion.css`.
- **How to trigger**: click the large logo at the top of the hero (centred above the headline, since the Phase 6 hero redesign). Hover alone gives the smaller parting tease.
- **Added**: `feat/home-polish`, per PHASE5 §1.
- **Note**: the navbar's smaller copy of the mark is intentionally _not_ click-spinnable — that button already owns the confetti easter egg above, and stacking two behaviours on one control would make both feel accidental.
