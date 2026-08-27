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
- `src/lib/motion.ts` — named JS exports (`bouncyPop`, `fadeInUp`, `staggerReveal`, `marqueeLoop`, `staggerStyle`) so components import symbols instead of hardcoding class-name strings.

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
import { bouncyPop, fadeInUp, staggerReveal, marqueeLoop, staggerStyle } from "@/lib/motion";

// Bouncy pop-in — buttons on click, badge reveals, easter-egg pop-ins (micro/meso tier)
<div className={bouncyPop}>🎉</div>

// Fade + rise — scroll reveals, modal open, card entrance (meso tier)
<div className={fadeInUp}>...</div>

// Staggered children — set staggerStyle(index) per child (macro tier)
<div className={staggerReveal}>
  {items.map((item, i) => (
    <div key={item.id} style={staggerStyle(i)}>{item.label}</div>
  ))}
</div>

// Continuous linear scroll — sponsor logo marquee, ticker text
<div className={marqueeLoop}>...</div>
```

Adding a new named preset: add the `@keyframes` + utility class to `src/app/motion.css`, export its class name from `src/lib/motion.ts`, and add its reduced-motion override in the same `@media (prefers-reduced-motion: reduce)` block — don't create a preset that skips that step.

## Reduced motion — applied by default, not opt-in

Every preset above already turns itself off under `prefers-reduced-motion: reduce` (see the media query at the bottom of `motion.css`) — a component using `bouncyPop` or `fadeInUp` is reduced-motion-safe automatically, with no extra hook or wrapper needed. **When adding a new preset, its reduced-motion override is part of the preset, not a separate step someone might forget.** This satisfies `DESIGN.md` §6.5: no motion may be required to access information or complete a task.

## Easter eggs

Every easter egg animation still follows the tiers/easing above (typically `bouncyPop` territory). Log every one added — what it is, where it lives, how to trigger it, which PR/year added it — in `/EASTER-EGGS.md` at the project root, so future organizers don't duplicate or collide with an existing one. See `DESIGN.md` §6.3 for the seed list of ideas.
