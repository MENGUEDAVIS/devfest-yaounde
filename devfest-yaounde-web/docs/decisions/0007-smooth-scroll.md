# 0007 — Momentum Scroll: adopt Lenis, or keep native?

Date: 2026-08-29
Status: **Proposed — awaiting decision. Nothing installed.**

## Context

`PHASE7_INSTRUCTIONS.md` §1a asks for **acceleration-driven scrolling** — a smooth accelerate-then-decelerate feel on wheel scroll, rather than the browser's native stepped jump. `PHASE7` also requires this be proposed as an ADR before any library is installed, so this record exists to make the choice explicit.

The coupled floating overlay scrollbar (§1b) is **not** blocked by this decision — it has been built already, reading scroll position through a single accessor so it works on native scroll today and can be pointed at a different scroll source with a one-line change.

## The options actually available

### Option A — Keep native scroll (no dependency)

Zero cost, zero risk, and the behaviour every user's OS and browser already agreed on. **Does not deliver the requested effect.**

Worth stating plainly: `scroll-behavior: smooth` in CSS does _not_ solve this. It only smooths _programmatic_ and anchor-link scrolling; wheel scrolling stays native. So it cannot be used as a lightweight substitute for what was asked.

### Option B — Hand-roll momentum scrolling (no dependency)

The technique is: intercept `wheel` events, maintain a virtual scroll position, interpolate it toward the target each animation frame, and translate a fixed-position content wrapper.

I'd advise against writing this ourselves. The interpolation loop is ~30 lines; the correctness burden around it is where the work actually is, and every item is a real regression risk:

- keyboard scrolling (Space, PageUp/Down, Home/End, arrow keys)
- focus scrolling — tabbing to an offscreen element must bring it into view
- browser find-on-page scrolling to a match
- anchor/hash links and `scrollIntoView()`
- `position: sticky` and `position: fixed` behaviour inside a transformed wrapper (our navbar chrome is fixed; transforms create containing blocks and break `fixed` children)
- touch/mobile inertia, which is usually _worse_ than native when re-implemented
- scroll-linked animations elsewhere on the page (Memory Lane's `ScrollStage`, every `Reveal`) needing to read the virtual position rather than `window.scrollY`

That list is precisely why Lenis exists. Reimplementing it badly is a worse outcome than either taking the dependency or not doing the effect.

### Option C — Adopt Lenis (recommended if the effect is wanted)

Verified facts, checked against the registry rather than assumed:

|                      |                                                                      |
| -------------------- | -------------------------------------------------------------------- |
| Package              | `lenis` (the old `@studio-freight/lenis` is **deprecated**, renamed) |
| Version              | 1.3.26                                                               |
| License              | MIT                                                                  |
| Runtime dependencies | **none**                                                             |
| Core bundle          | 18.3 KB minified, **8.1 KB gzipped**                                 |
| React binding        | separate 5.1 KB module (`lenis/react`), optional                     |
| Peer deps            | `react >=17` — satisfied (we're on 19)                               |
| Last published       | 2026-08-24 (5 days before this record) — actively maintained         |

It handles the correctness list above, exposes a `scroll` event we can drive the floating scrollbar and scroll-linked animations from, and can be disabled at runtime.

## Recommendation

**Option C if you want the effect; Option A if you're ambivalent.** I'd not do Option B.

One honest caveat, since it's my job to raise it rather than just build what's asked: scroll hijacking is genuinely contested on accessibility and UX grounds. It overrides a behaviour the user configured at OS level, and a minority of people find momentum scrolling disorienting or motion-sickness-inducing. `prefers-reduced-motion` catches the users who've declared the preference, but not everyone who dislikes it has set that flag. Plenty of well-designed sites use it happily; it's a taste call that's legitimately yours, and I'll build it properly if you want it — I just don't want to install it without you having heard the tradeoff.

## If approved, the implementation contract (non-negotiable, per PHASE7 §1a)

1. **Off entirely under `prefers-reduced-motion: reduce`** — never initialised, native scroll untouched. Live-checked via `matchMedia` change listener, not just at mount.
2. **Desktop-only.** Mobile native inertia is better than anything Lenis gives us; enable only for pointer-capable, non-coarse input.
3. Keyboard scrolling, focus scrolling, find-on-page, anchor links and `scrollIntoView` all verified working before merge — tested, not assumed.
4. The fixed navbar chrome must be verified unaffected (transform containing-block hazard).
5. `ScrollStage` / `Reveal` continue working — they use `IntersectionObserver` and `getBoundingClientRect`, both of which reflect real layout position, so they should be unaffected; verified rather than assumed.
6. The floating scrollbar switches from the native accessor to Lenis's `scroll` event via the existing single seam.

## Consequences

- **Approving** adds the project's first non-essential runtime dependency (~8 KB gz) and a scroll behaviour that must be re-verified whenever chrome/layout changes.
- **Declining** keeps the dependency count at essentials only; the floating scrollbar and everything else in Phase 7 still ship, on native scroll.
