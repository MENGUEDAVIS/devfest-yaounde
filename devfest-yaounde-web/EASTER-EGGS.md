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

## Headline text-scramble (decode)

- **What**: hovering certain H-level headlines makes each character churn through random ASCII-ish glyphs and then resolve, left to right, back to the real text.
- **Where**: `src/components/ui/ScrambleText.tsx`, with `.scramble` in `src/app/motion.css`. Wired into the Home hero's "DevFest" line and the `/speakers` and `/team` page H1s.
- **How to trigger**: hover (or keyboard-focus) a headline that carries it. Click also fires it, which is how it stays reachable on touch, where there is no hover.
- **Added**: PHASE11 §1.
- **Notes**:
  - **Not every headline has it.** `/schedule` and `/faqs` are deliberately plain, so the effect reads as a find rather than a site-wide tic.
  - It animates the REAL DOM text, so accented characters resolve correctly — "Yaoundé" comes back as "Yaoundé". This is why it replaced the earlier ASCII-art banner egg (PHASE10 §10), which needed a bitmap block font with no accented glyphs and so could only have misspelled the city or left a hole.
  - The affordance is deliberate: a dotted underline in the theme colour appears on hover. An egg nobody can find isn't delight, it's dead code.
  - The mid-scramble string is nonsense, so it never reaches assistive tech: the real text stays in an `sr-only` span and the animating span is `aria-hidden`.
  - Under `prefers-reduced-motion` the scramble never starts — the headline just sits there.
  - **Supersedes** the ASCII-art banner egg, which is removed. `src/lib/ascii.ts` and `AsciiHeadline.tsx` are gone; don't reintroduce them.

## Bracket cursor

- **What**: on desktop, the pointer becomes a small solid dot with a larger angled-bracket ring (the logo's `><` motif) chasing it. Over anything clickable the ring grows and the brackets open out to frame the target; pressing squeezes it.
- **Where**: `src/components/global/CustomCursor.tsx` + the `.cursor-*` block in `src/app/globals.css`. Mounted once in `src/app/[locale]/layout.tsx`.
- **How to trigger**: just use a mouse on desktop. It recolours with the footer theme switcher.
- **Added**: PHASE11 §2.
- **Notes** — this one is a hazard if handled carelessly, so the guards are the point:
  - It does not run at all on coarse pointers, without hover, or under `prefers-reduced-motion`. Both media queries are watched live, so plugging in a mouse or toggling the OS motion setting takes effect without a reload.
  - The native cursor is hidden ONLY by a class the component adds after those checks pass. If the script never runs, the cursor is simply never hidden — the failure mode is "no custom cursor", never "no cursor".
  - The dot sits at the TRUE pointer position with no easing; only the ring lags. A lagging cursor would make every click feel a few pixels off.
  - Text inputs keep their native I-beam, and the whole layer is `pointer-events: none` so it can never swallow a click.
