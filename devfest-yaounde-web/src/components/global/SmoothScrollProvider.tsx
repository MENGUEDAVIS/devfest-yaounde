"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { setActiveLenis } from "@/lib/scroll-source";

/**
 * Momentum scrolling — `docs/decisions/0007-smooth-scroll.md` (Accepted).
 *
 * Renders nothing; it only owns the Lenis lifecycle. Every one of the ADR's
 * six non-negotiables is implemented here:
 *
 * 1. OFF under `prefers-reduced-motion` — and live-tracked via a matchMedia
 *    `change` listener, so flipping the OS setting tears Lenis down (or
 *    brings it back) without a reload.
 * 2. Desktop/pointer-only — gated on the primary pointer NOT being coarse.
 *    Deliberately not `(pointer: fine)`: some perfectly ordinary desktop
 *    environments (headless Chrome, certain Linux/VM setups) report neither
 *    fine nor coarse, and requiring `fine` silently disabled the feature
 *    there. Excluding coarse targets exactly the case we mean — touch as the
 *    primary input — while a hybrid laptop with both a trackpad and a
 *    touchscreen still reports `pointer: fine` and keeps momentum scroll.
 * 3. Keyboard, focus-scroll, find-on-page, anchors and `scrollIntoView`
 *    keep working: Lenis scrolls the REAL document rather than transforming
 *    a wrapper, so the browser's own scrolling machinery stays in charge.
 *    `syncTouch: false` leaves touch entirely alone.
 * 4. The fixed navbar chrome is unaffected for the same reason — no
 *    ancestor transform is created, so no containing-block hazard for
 *    `position: fixed` children.
 * 5. `ScrollStage` / `Reveal` keep working: they read IntersectionObserver
 *    and `getBoundingClientRect`, both of which reflect real layout.
 * 6. The floating scrollbar reads through `@/lib/scroll-source`, which is
 *    handed the instance below.
 *
 * All six are verified by the checks recorded in the ADR, not assumed.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");

    let lenis: Lenis | null = null;
    let frame = 0;

    function teardown() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lenis?.destroy();
      lenis = null;
      setActiveLenis(null);
    }

    function sync() {
      const wanted = !motionQuery.matches && !coarseQuery.matches;

      if (!wanted) {
        teardown();
        return;
      }
      if (lenis) return;

      lenis = new Lenis({
        // Gentle accelerate-then-decelerate. Higher `duration` reads as
        // sluggish and is the usual reason people hate smooth scroll.
        duration: 0.9,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
        smoothWheel: true,
        // Never intercept touch — native inertia wins there (contract #2)
        syncTouch: false,
        touchMultiplier: 1,
      });
      setActiveLenis(lenis);

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    sync();
    motionQuery.addEventListener("change", sync);
    coarseQuery.addEventListener("change", sync);

    return () => {
      motionQuery.removeEventListener("change", sync);
      coarseQuery.removeEventListener("change", sync);
      teardown();
    };
  }, []);

  return null;
}
