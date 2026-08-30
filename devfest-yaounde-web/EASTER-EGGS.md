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

## Page-title text-scramble (decode)

- **What**: clicking a page's top title makes each character churn through random ASCII-ish glyphs and then resolve, left to right, back to the real text.
- **Where**: `src/components/ui/ScrambleText.tsx`, with `.scramble` in `src/app/motion.css`. Wired into **every page's H1** — the Home hero's "DevFest" line and the `/speakers`, `/team`, `/schedule`, `/faqs`, `/tickets`, `/shop` and `/dp-generator` titles. Exactly one per page.
- **How to trigger**: **click the page title.** That is the only trigger.
- **Added**: PHASE11 §1. Substantially reworked in PHASE12 §4.
- **Notes** — PHASE12 made it a genuinely HIDDEN egg, which changed four things:
  - **Click only.** Hover no longer does anything.
  - **No affordance at all.** The dotted underline is gone and the cursor does **not** change over the title. The earlier version advertised itself, which made it a feature rather than a secret. Do not add a hover hint back.
  - **Never on page load.** The title always renders normally first.
  - **Much slower.** The first version resolved in ~9 frames, which read as a blink. It now holds each glyph for several frames and staggers the characters, so the decode is watchable — roughly a second and a half for a short title.
  - Scope is the **top H1 only**, never sub-headings.
  - It animates the REAL DOM text, so accented characters resolve correctly — "Yaoundé" comes back as "Yaoundé". This is why it replaced the earlier ASCII-art banner egg (PHASE10 §10), which needed a bitmap block font with no accented glyphs and so could only have misspelled the city or left a hole.
  - The mid-scramble string is nonsense, so it never reaches assistive tech: the real text stays in an `sr-only` span and the animating span is `aria-hidden`. That copy is `user-select: none` so selecting the heading doesn't yield the title twice.
  - Under `prefers-reduced-motion` clicking does nothing at all.
  - **Supersedes** the ASCII-art banner egg, which is removed. `src/lib/ascii.ts` and `AsciiHeadline.tsx` are gone; don't reintroduce them.

## Trailing arrow cursor

- **What**: on desktop, the pointer becomes a small solid dot with a larger **rounded arrow** chasing it. Over anything clickable the arrow fades back and a ring blooms to frame the target; pressing squeezes it.
- **Where**: `src/components/global/CustomCursor.tsx` + the `.cursor-*` block in `src/app/globals.css`. Mounted once in `src/app/[locale]/layout.tsx`.
- **How to trigger**: just use a mouse on desktop. It recolours with the footer theme switcher — to the **contrast** of the active theme (Blue↔Red, Yellow↔Green), never the active family itself.
- **Added**: PHASE11 §2. Reshaped and recoloured in PHASE12 §3 — it used to be the logo's angled brackets in the theme colour, which read as a logo fragment stuck to the pointer and disappeared against a same-family wash.
- **Notes** — this one is a hazard if handled carelessly, so the guards are the point:
  - It does not run at all on coarse pointers, without hover, or under `prefers-reduced-motion`. Both media queries are watched live, so plugging in a mouse or toggling the OS motion setting takes effect without a reload.
  - The native cursor is hidden ONLY by a class the component adds after those checks pass. If the script never runs, the cursor is simply never hidden — the failure mode is "no custom cursor", never "no cursor".
  - The dot sits at the TRUE pointer position with no easing; only the ring lags. A lagging cursor would make every click feel a few pixels off.
  - Text inputs keep their native I-beam, and the whole layer is `pointer-events: none` so it can never swallow a click.
