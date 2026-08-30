---
name: devfest-animation
description: Use when implementing any hover state, transition, page/section entrance, modal or drawer open/close, celebratory moment (ticket purchase, order confirmation), or easter egg on the DevFest Yaoundé site. Turns DESIGN.md §6's easing/motion spec into reusable, named code presets so components stop hand-rolling slightly-different animations.
---

# DevFest Yaoundé Animation Presets

`DESIGN.md` §6 is the spec (easing curves, motion tiers, easter-egg concept). This skill is where that spec becomes actual reusable code. **Do not hand-roll a one-off transition or keyframe for a case this skill already covers — reuse the preset. If a real case isn't covered yet, add it here rather than solving it once and moving on** (this skill is living, not a one-time file).

## Current stack note

No animation library (Framer Motion, GSAP, etc.) is installed. Everything below is CSS custom properties + Tailwind + plain CSS keyframes, per `docs/decisions/0002-tech-stack.md`. **Adding an animation library is a tech-stack decision, not a routine addition** — it needs its own ADR and explicit go-ahead, not a silent `npm install` because a component "would be easier with X."

## Where the code lives

- `src/app/motion.css` — the actual `@keyframes` and utility classes, imported into `src/app/globals.css`.
- `src/lib/scroll-source.ts` — the single seam for "what drives page scroll". The floating scrollbar reads position through it; if the momentum-scroll ADR (`docs/decisions/0007-smooth-scroll.md`) is approved, only this file changes.
- `src/lib/motion.ts` — named JS exports (`bouncyPop`, `fadeInUp`, `heroRise`, `shapeDrift`, `marqueeLoop`, `marqueeTrack`, `confettiPiece`, `modalBackdropIn`, `modalPopIn`, `navSettle`, `revealOnScroll`, `maskLine`, `stampIn`, `sessionIn`, `heroBgDrift`, `tileIn`, `scrollCue`, plus `staggerStyle` / `heroDelayStyle` / `lineStyle` / `stampStyle` / `sessionStyle` / `tileStyle` / `confettiPieceStyle`) so components import symbols instead of hardcoding class-name strings.
- `src/components/ui/Reveal.tsx` — the scroll-reveal wrapper (see `docs/components/reveal.md`). Use this for section entrances rather than hand-rolling an IntersectionObserver.
- `src/components/ui/ScrollStage.tsx` — scroll-position-linked choreography with **enter AND exit** motion plus parallax (see `docs/components/scroll-stage.md`). Use when a one-shot reveal isn't enough.

Additional presets: `wordPop` + `wordStyle(i, baseMs)` for kinetic per-word headlines; `spotlightGroup`/`spotlightItem` for hover-spotlight card groups; `stagePhoto`/`stageParallax` with `stagePhotoStyle`/`parallaxStyle` for ScrollStage choreography; `.link-group`/`.link-item` for scoped link dimming.

### Two rules that keep biting

1. **Never put two transform-setting classes on the same element.** Parallax + stage choreography, or Reveal + spotlight, must live on separate nested elements — otherwise one silently overwrites the other.
2. **`overflow-x: auto`/`hidden` forces `overflow-y` to compute as `auto` too.** A horizontal track therefore clips vertical hover lifts and scaled/rotated cards. Give the clipping element generous vertical padding rather than expecting `overflow-y: visible` to work — there is no combination that clips one axis and lets the other overflow.
3. **`.anim-word-pop` sets `display: inline-block`**, which beats a Tailwind `block` utility on the same element. Put line breaks on an outer wrapper span, not on the animated one.
4. **Don't hardcode rem-based carousel steps.** Card widths and gaps usually change at a breakpoint, so a fixed step desyncs from the padding. Measure `offsetLeft`/`offsetWidth` from the DOM and translate in px instead.

## The easing tokens (from DESIGN.md §6.1, defined in `globals.css`'s `@theme` block)

```css
--ease-bouncy: cubic-bezier(
  0.34,
  1.56,
  0.64,
  1
); /* playful: button press, add-to-cart, badge reveal, easter eggs */
--ease-out-devfest: cubic-bezier(
  0.16,
  1,
  0.3,
  1
); /* content entering: scroll reveals, modal open, card hover-lift */
--ease-in-out-devfest: cubic-bezier(
  0.65,
  0,
  0.35,
  1
); /* state transitions: tab switches, page transitions */
/* linear (no token needed — just `linear`): marquees, rotating shapes, progress bars, countdown ticks */
```

## Motion tiers (durations — DESIGN.md §6.2)

| Tier  | Duration   | Use for                                                                 |
| ----- | ---------- | ----------------------------------------------------------------------- |
| Micro | 100–250ms  | button hover/press, icon state changes, focus rings, underline draw-ins |
| Meso  | 250–600ms  | card hover-lift, modal/drawer open, tab content swap, mask reveal       |
| Macro | 600ms–1.2s | hero load sequence, staggered scroll-reveals, celebration animations    |

## Named presets — import from `@/lib/motion`

```tsx
import {
  bouncyPop, fadeInUp, heroRise, heroDelayStyle,
  shapeDrift, marqueeLoop, marqueeTrack,
  modalBackdropIn, modalPopIn,
  maskLine, lineStyle, stampIn, stampStyle, sessionIn, sessionStyle,
} from "@/lib/motion";
import { Reveal } from "@/components/ui/Reveal";

// Bouncy pop-in — badge reveals, easter-egg pop-ins (micro/meso tier)
<div className={bouncyPop}>🎉</div>

// Fade + rise on mount — e.g. a rotating quote replaying via `key`
<blockquote key={quote.id} className={fadeInUp}>...</blockquote>

// Hero load sequence — stagger each element with heroDelayStyle (macro tier)
<h1 className={heroRise} style={heroDelayStyle(120)}>...</h1>
<p  className={heroRise} style={heroDelayStyle(240)}>...</p>

// Staggered scroll-reveal — the standard way to animate sections in
{items.map((item, i) => (
  <Reveal key={item.id} index={i}><Card {...item} /></Reveal>
))}

// Continuous linear scroll — sponsor marquee. Wrap in marqueeTrack to
// pause on hover; only marquee when content actually overflows.
<div className={marqueeTrack}><div className={marqueeLoop}>...</div></div>

// Ambient drift for a big decorative hero shape
<div aria-hidden className={shapeDrift} />

// Masked line reveal — the bold hero entrance. Outer span clips, inner animates.
<span className={maskLine}><span style={lineStyle(0, 260)}>DevFest</span></span>

// Rubber-stamp entrance for a headline highlight block
<span className={stampIn} style={stampStyle(760, -1.5)}>Yaoundé 2026</span>

// Staggered schedule session cards
<li className={sessionIn} style={sessionStyle(i, -0.8)}>…</li>

// Modal backdrop fade + panel scale-in (ease-out, meso tier)
<div className={modalBackdropIn}>...</div>
<div className={modalPopIn}>...</div>
```

Adding a new named preset: add the `@keyframes` + utility class to `src/app/motion.css`, export its class name from `src/lib/motion.ts`, and add its reduced-motion override in the same `@media (prefers-reduced-motion: reduce)` block — don't create a preset that skips that step.

## PERCEPTIBILITY IS THE BAR (DESIGN.md §7c)

The Phase 1–3 build had motion "on paper" that nobody could feel. Motion here is tuned to be **felt**: travel distances are 40–64px (not 12px), durations sit at the top of their tier, and stagger steps are 110ms. If a reviewer scrolls the page and feels like nothing is animating, this layer has failed — that's a bug, not a taste question.

Required on any new page:

1. A noticeable load/entrance sequence (`heroRise` + `heroDelayStyle` staggering).
2. Staggered scroll-reveals on sections as they enter the viewport (`<Reveal index={i}>`).
3. Real hover feedback on every interactive element — lift + flat offset shadow, not just a color tint.

## Reduced motion — applied by default, not opt-in

Every preset above already turns itself off under `prefers-reduced-motion: reduce` (see the media query at the bottom of `motion.css`) — a component using `bouncyPop` or `fadeInUp` is reduced-motion-safe automatically, with no extra hook or wrapper needed. **When adding a new preset, its reduced-motion override is part of the preset, not a separate step someone might forget.** This satisfies `DESIGN.md` §6.5: no motion may be required to access information or complete a task.

## Easter eggs

Every easter egg animation still follows the tiers/easing above (typically `bouncyPop` territory). Log every one added — what it is, where it lives, how to trigger it, which PR/year added it — in `/EASTER-EGGS.md` at the project root, so future organizers don't duplicate or collide with an existing one. See `DESIGN.md` §6.3 for the seed list of ideas.


## Reveal uses a DATA ATTRIBUTE, not a class (PHASE11 §8)

`<Reveal>` marks itself visible with `data-visible="true"`, and
`.anim-reveal[data-visible="true"]` is what shows it.

It used to add an `is-visible` CLASS. Don't go back to that. React owns the
`className` attribute on that node and rewrites it whenever the `className`
prop changes — which destroys any class added imperatively. The symptom is
nasty and non-obvious: pass a conditional class to `Reveal` (as the speakers
and team grids do), and the element silently snaps back to `.anim-reveal`'s
hidden state — opacity 0, translateY(40px) — keeping its layout space while
its content vanishes, permanently, because the observer has already
unobserved it.

The general rule: if React manages an attribute, don't also write it from an
effect. Use one React doesn't touch.

## Everything new goes in the reduced-motion block

Every animation added in a phase must also appear in the
`@media (prefers-reduced-motion: reduce)` block at the bottom of
`src/app/motion.css`. Current entries include the cinema stage, the polaroid,
the person popover, the FAQ scrollspy and the scramble affordance.

Two of the newer effects are guarded in JS instead, because they are driven
by rAF rather than CSS: the headline scramble never starts, and the custom
cursor never mounts its listeners. Both read `matchMedia` live rather than
caching it, so toggling the OS setting takes effect without a reload.
