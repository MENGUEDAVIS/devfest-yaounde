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

1. `Modal` gained a **`variant` prop**: `dialog` (the existing centred panel) and `takeover` (a true full-screen surface at `z-100`, above the chrome's `z-50`). Everything else — portal, trap, Escape, backdrop, scroll lock, focus restore — is shared verbatim.

   The takeover carries **no panel chrome at all** — no card, no border, no background. Content sits directly on a blurred scrim (`bg-black02/80` + `backdrop-blur`), which is a flat wash over a blur, not a gradient (DESIGN.md §2.6). A card inside a takeover wastes the screen the takeover exists to claim.

   It also **requests the browser Fullscreen API**, opt-in via `browserFullscreen`. That request is best-effort: it needs live user activation and can be refused, so a rejection is swallowed and the in-app overlay still covers the viewport. Leaving fullscreen by any route the browser owns (Esc, F11, the OS) closes the overlay, so the two can never disagree about what the user is looking at.

2. The filter drawer was **extracted out of `FilterLayout`** into a `BottomSheet` component, which now serves both the filter drawer and mobile card details.

3. Scroll locking moved into **`lockScroll()` in `src/lib/scroll-source.ts`**, the module that already owns the scroll seam, and both overlays call it.

Result: one focus trap implementation, one scroll lock, two overlay shells with clear roles.

## Why scroll locking had to live in the scroll seam

`overflow: hidden` on `<body>` is not enough here, for reasons found by measurement rather than reasoning:

- **A momentum-scroll library, while one was in use, kept running regardless.** It drove its own rAF loop against the real document, so the background still glided under a "locked" overlay. Only `scroll-source.ts` held that instance, so only it could stop it. Moot now — that library was removed outright (ADR 0053) — but it is why the lock had to live behind a shared seam rather than be reimplemented per overlay, and it still would be if a second scroll driver were ever added again.
- **`<html>` is the scrolling element.** Hiding overflow on the body alone left the page scrollable — verified: the background moved 400px under the overlay. This one is permanent, driver or no driver.

Putting the lock anywhere else would have meant every overlay author rediscovering both.

## Consequences and trade-offs

- **The takeover covers the navbar.** An earlier revision deliberately stopped below it so the nav stayed usable; that was reversed — a takeover that leaves a strip of page showing is a large modal, not a takeover, and the half-covered navbar read as an accident. `aria-modal="true"` is now unambiguous: nothing outside the dialog is reachable, which matches what the user sees.
- The takeover's box constants (overlay padding, controls row) are **duplicated in `.cinema-stage`'s `--stage-h`** so the slide can size itself in real lengths. That coupling is commented in both places. It exists because percentages in a `translateY(calc(...))` resolve against the transformed element, not its parent — which silently mispositioned the reel until it was measured.
- **Fullscreen is not guaranteed.** Everything must work without it, and does: the overlay's own geometry is what covers the screen. Treat the API as polish.
- `Modal`'s `dialog` variant remains unused by any feature. It is kept because the takeover is now built on the same shell, so the dialog path is exercised structurally and costs nothing.
