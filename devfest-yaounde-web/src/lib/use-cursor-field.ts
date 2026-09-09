"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-reactive parallax for a whole group of elements, at the cost of two
 * style writes per frame.
 *
 * ## How it avoids being the slow kind of parallax
 *
 * The naive version stores the pointer in React state and re-renders every
 * satellite on every mousemove — dozens of renders a second, each one
 * recalculating a tree to move three boxes.
 *
 * This writes **two custom properties on the container**: `--px` and `--py`,
 * each a unitless -1..1. Every satellite already declares its own depth in
 * CSS and multiplies, so one write moves all of them, on the compositor,
 * with React uninvolved after mount.
 *
 * The values are eased toward the pointer in a rAF loop rather than snapped,
 * which is what makes it read as drift rather than as a cursor-follower. The
 * loop **stops when it settles** — an idle hero should not hold a frame
 * callback open for a tab nobody is looking at.
 *
 * ## What it deliberately does not do
 *
 * Nothing here runs without a fine pointer or under `prefers-reduced-motion`.
 * The satellites then sit exactly where CSS put them, which is the composed
 * static layout — not a degraded version of a moving one.
 */
export function useCursorField<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /*
      `any-hover`, not `hover`.

      `(hover: hover)` asks about the PRIMARY pointer, and on a touchscreen
      laptop that is the touchscreen — so a machine with a trackpad right
      there would be told it has no mouse and get none of this. `any-hover`
      asks whether ANY attached input can hover, which is the question being
      asked. Phones and tablets still answer no.

      Read once. Neither of these changes without a reload in practice, and a
      listener that never fires is cheaper than one that re-tests per move.
    */
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

  return ref;
}
