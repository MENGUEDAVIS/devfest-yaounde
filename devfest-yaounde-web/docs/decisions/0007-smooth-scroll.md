# 0007 — Momentum Scroll: adopt Lenis, or keep native?

Date: 2026-08-29
Status: **Superseded / Reverted** (2026-09-11) by ADR 0053. `lenis@1.3.26` was installed, implemented, verified against every item in this record's own contract below — and still broke scroll in production use in ways none of that verification caught. It has been removed outright, not disabled. See ADR 0053 for the specifics and why "keep it, but fix the bug" was rejected in favour of removing the dependency entirely.

**Read this record for the historical reasoning** (why native alone couldn't deliver the requested effect, why hand-rolling it was rejected, what the verified contract was). Do not use it to justify re-adopting Lenis or any similar library without reading ADR 0053 first — the verification below was real and still missed a real-world failure mode; a future proposal needs to explain what would catch that this one didn't.

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

## Outcome — approved, and how each contract item was verified

Implemented in `src/components/global/SmoothScrollProvider.tsx`, wired to the
floating scrollbar through the existing `src/lib/scroll-source.ts` seam.

| #   | Contract item                                    | How it was verified                                                                                                                                                                                                    | Result                                 |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Off under `prefers-reduced-motion`, live-tracked | Emulated the media feature; checked Lenis's `lenis` root class is absent and that a programmatic `scrollTo` lands instantly with no easing. A `matchMedia` `change` listener tears the instance down without a reload. | Class absent, instant scroll to 1200px |
| 2   | Desktop/pointer only                             | Loaded with a touch viewport (`isMobile`, `hasTouch`); confirmed no Lenis class and that native scrolling still works.                                                                                                 | Class absent, native scroll to 800px   |
| 3   | Keyboard, focus-scroll, anchors, find-on-page    | With Lenis **active**: PageDown → 787, End → 7613, Home → 0; focusing an offscreen footer link brought it into view (`inView: true`); `scrollIntoView(footer)` → 4644.                                                 | All work                               |
| 4   | Fixed navbar chrome unaffected                   | Scrolled deep, then read the chrome's computed `position` and offset. Lenis scrolls the real document instead of transforming a wrapper, so no containing block is created for `position: fixed` children.             | `position: fixed`, `top: 0`            |
| 5   | `ScrollStage` / `Reveal` still work              | Scrolled the full page and counted resolved reveals.                                                                                                                                                                   | 20/20 resolved                         |
| 6   | Floating scrollbar driven by Lenis               | Read the thumb's `aria-valuenow` and offset at the page bottom.                                                                                                                                                        | 100%, correctly positioned             |

Momentum itself was confirmed behaviourally rather than assumed: a wheel event produces `0 → 66 → 128 → 189 → 248 → 304 → 357 → 409 → 458 → 506` across ten frames — decelerating deltas, i.e. genuine accelerate-then-decelerate easing rather than a jump.

### One correction made during implementation

The gate was first written as `(pointer: fine) && !(pointer: coarse)`. That is **too strict**: some ordinary desktop environments (headless Chrome, and some Linux/VM setups) report _neither_ pointer type, so `fine` was false and Lenis silently never initialised — which the first verification run masked, because every contract check then passed against plain native scroll.

The gate is now simply "primary pointer is **not coarse**". This still excludes touch-primary devices (the actual intent), keeps momentum on hybrid laptops that report `pointer: fine` alongside a touchscreen, and no longer disables the feature in environments that report nothing. Worth remembering: `(pointer: fine)` is not a reliable proxy for "is a desktop".

### Known limitation

Browser **find-on-page** cannot be driven programmatically, so it wasn't directly automated. It relies on the same document-scrolling machinery as `scrollIntoView` and focus-scroll, both of which were verified working with Lenis active — but it's worth one manual Ctrl+F pass before launch rather than treating it as proven.

## Consequences

- **Approving** adds the project's first non-essential runtime dependency (~8 KB gz) and a scroll behaviour that must be re-verified whenever chrome/layout changes.
- **Declining** keeps the dependency count at essentials only; the floating scrollbar and everything else in Phase 7 still ship, on native scroll.
