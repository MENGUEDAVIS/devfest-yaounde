# 0012 — One overlay shell, one bottom sheet

- **Status:** Accepted
- **Date:** 2026-08-30

## Context

PHASE13 asked for two new surfaces:

1. A **full-page locked takeover** for the person slider, covering the viewport except the navbar, with scroll frozen and dismissal by button, Escape and click-outside.
2. A **bottom sheet** for mobile card details.

Both are overlays. Both need a focus trap, Escape handling, scroll locking, focus restoration and a scrim. The repo already had one of each pattern:

- `Modal` (PHASE3) — portal, focus trap, Escape, backdrop close, scroll lock. **Written, then never used by anything.**
- The mobile filter drawer (PHASE9) — the same mechanics again, written **inline inside `FilterLayout`**.

So the honest question was not "what should I build" but "how many focus traps should this codebase have".

## Decision

**Extend, don't duplicate.**

1. `Modal` gained a **`variant` prop**: `dialog` (the existing centred panel) and `takeover` (full viewport below the fixed chrome, at `z-40` so the navbar's `z-50` stays above it). Everything else — portal, trap, Escape, backdrop, scroll lock, focus restore — is shared verbatim.

2. The filter drawer was **extracted out of `FilterLayout`** into a `BottomSheet` component, which now serves both the filter drawer and mobile card details.

3. Scroll locking moved into **`lockScroll()` in `src/lib/scroll-source.ts`**, the module that already owns the scroll seam, and both overlays call it.

Result: one focus trap implementation, one scroll lock, two overlay shells with clear roles.

## Why scroll locking had to live in the scroll seam

`overflow: hidden` on `<body>` is not enough here, for two independent reasons, both found by measurement rather than reasoning:

- **Lenis keeps running.** It drives its own rAF loop against the real document, so the background still glided under a "locked" overlay. Only `scroll-source.ts` holds the Lenis instance, so only it can stop it.
- **`<html>` is the scrolling element.** Hiding overflow on the body alone left the page scrollable — verified: the background moved 400px under the overlay.

Putting the lock anywhere else would have meant every overlay author rediscovering both.

## Consequences and trade-offs

- **The takeover sets `aria-modal="true"` while the navbar stays visible above it.** These are in tension: `aria-modal` tells assistive tech to ignore everything outside the dialog, so the navbar is visible and pointer-clickable but not reachable by keyboard or screen reader while the lockup is open. The alternative — no focus trap — would let Tab wander into a page the user can't see or scroll. The trap is the safer failure, and the takeover's own close button returns to the grid.
- The takeover's height constants (chrome height, panel padding, controls row) are **duplicated in `.cinema-stage`'s `--stage-h`** so the slide can size itself in real lengths. That coupling is commented in both places. It exists because percentages in a `translateY(calc(...))` resolve against the transformed element, not its parent — which silently mispositioned the reel until it was measured.
- `Modal`'s `dialog` variant remains unused by any feature. It is kept because the takeover is now built on the same shell, so the dialog path is exercised structurally and costs nothing.
