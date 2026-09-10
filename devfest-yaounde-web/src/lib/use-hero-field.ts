"use client";

import { useEffect, useRef } from "react";

/**
 * Everything the hero reacts to: the pointer while it is here, the scroll
 * once you leave.
 *
 * Two independent effects sharing one ref and one node — kept in the same
 * hook because both write onto the same element, and a component consuming
 * two hooks that each want their own ref would need a ref-merging utility
 * this codebase does not otherwise have. Neither effect touches React state;
 * both write CSS custom properties directly, so a whole gesture or a whole
 * scroll never triggers a re-render.
 *
 * ## The pointer half — `--px` / `--py`
 *
 * The naive version stores the pointer in React state and re-renders every
 * satellite on every mousemove. This writes **two custom properties on the
 * container**, each a unitless -1..1; every satellite already declares its
 * own `--depth` in CSS and multiplies, so one write moves all of them, on the
 * compositor.
 *
 * Values are eased toward the pointer in a rAF loop rather than snapped,
 * which is what makes it read as drift rather than as a cursor-follower. The
 * loop stops when it settles — an idle hero should not hold a frame callback
 * open for a tab nobody is looking at.
 *
 * Gated on `(any-hover: hover)`, not `(hover: hover)` — the latter asks about
 * the PRIMARY pointer, and on a touchscreen laptop that is the touchscreen,
 * so a machine with a trackpad right there would be told it has no mouse.
 * `any-hover` asks whether ANY attached input can hover.
 *
 * ## The scroll half — `--exit`
 *
 * A single custom property, 0 while the hero is on screen and easing to 1 as
 * it scrolls out from under the navbar — "you are leaving the scene". Unlike
 * the pointer half this runs for EVERY visitor, touch included: leaving is
 * something scrolling does, not something a mouse does. Reduced motion is
 * the only gate.
 *
 * Computed from the hero's own `getBoundingClientRect().top` on a
 * rAF-throttled scroll listener — one `requestAnimationFrame` pending at a
 * time, however many `scroll` events fire inside it — and run once
 * immediately on mount so a page restored mid-scroll (back-navigation)
 * starts correct rather than snapping on the first pixel of movement.
 *
 * ## What neither half does
 *
 * Nothing here runs under `prefers-reduced-motion`. The composition then
 * sits exactly where CSS put it and leaves the way any other page does — the
 * composed static layout, not a degraded version of a moving one.
 */
export function useHeroField<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  // --- the pointer: leans the satellites toward wherever it is ------------
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(any-hover: hover)").matches
    ) {
      return;
    }

    /*
      All of this lives inside the effect rather than in `useCallback`s
      because the loop refers to itself, and a memoised callback that
      re-requests itself is both a lint error and a real footgun: the identity
      it closes over is not necessarily the one that is running.
    */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame: number | null = null;

    const tick = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      current.x += dx * 0.08;
      current.y += dy * 0.08;

      node.style.setProperty("--px", current.x.toFixed(4));
      node.style.setProperty("--py", current.y.toFixed(4));

      // A twentieth of a percent of the container is well under a pixel of
      // movement. Holding a rAF open past that is work nobody can see.
      if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) {
        frame = null;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      /*
        Normalised to -1..1 from the CENTRE, so a satellite's depth is a
        distance in px and the maths in CSS stays readable. The box is read
        per move rather than cached: the hero is full-height and the page
        scrolls under it.
      */
      target.x = ((event.clientX - box.left) / box.width) * 2 - 1;
      target.y = ((event.clientY - box.top) / box.height) * 2 - 1;
      wake();
    };

    /* Drift home when the pointer leaves, rather than freezing mid-lean. */
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      wake();
    };

    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // --- the scroll: recedes as the hero leaves under the navbar ------------
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /*
      EXIT_DISTANCE is how far the hero has to scroll past its own top edge
      before the recede is complete. Three quarters of a viewport rather than
      a whole one: the hero's tallest content (the wordmark) sits in the
      BOTTOM half, so it has already scrolled well under the navbar — and
      therefore is already most of the way "gone" as far as a viewer is
      concerned — before a full viewport-height of scrolling has happened.
      Tying the distance to the full height would make the recede finish
      later than the thing it is receding has actually left.
    */
    let ticking = false;

    const measure = () => {
      ticking = false;
      const top = node.getBoundingClientRect().top;
      const distance = window.innerHeight * 0.75;
      const progress = Math.min(1, Math.max(0, -top / distance));
      node.style.setProperty("--exit", progress.toFixed(4));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    measure(); // correct immediately for a page restored mid-scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}
