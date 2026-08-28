"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface ScrollStageProps {
  children: ReactNode;
  className?: string;
}

/**
 * Drives scroll-position-linked choreography for a section — motion on the
 * way IN *and* on the way OUT, rather than a one-shot reveal (PHASE5 §5).
 *
 * It writes two things onto the stage element:
 *  - `--stage-progress`: 0 when the section's top is entering from below,
 *    1 when it has travelled fully past the top of the viewport. Used by
 *    `.stage-parallax` to drift elements at different depths.
 *  - `is-entering` / `is-leaving` classes: used by `.stage-photo` so photos
 *    assemble on entry and disperse on exit.
 *
 * Implementation notes:
 *  - Everything is written directly to the DOM node inside a rAF-throttled
 *    scroll handler. Deliberately not React state: this fires on every
 *    scroll frame, and re-rendering a photo grid that often would be
 *    wasteful (and would trip the set-state-in-effect lint rule).
 *  - `prefers-reduced-motion` short-circuits the whole thing: the stage is
 *    pinned to the settled state and no scroll listener is attached, so
 *    these users get calm static content with no parallax at all. The CSS
 *    also force-disables the transforms as a second line of defence.
 */
export function ScrollStage({ children, className = "" }: ScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      node.style.setProperty("--stage-progress", "0.5");
      node.classList.add("is-entering");
      node.classList.remove("is-leaving");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;

      // 0 -> just about to enter from below; 1 -> fully past the top.
      const travel = rect.height + vh;
      const raw = (vh - rect.top) / travel;
      const progress = Math.min(Math.max(raw, 0), 1);
      node.style.setProperty("--stage-progress", progress.toFixed(4));

      // Entering once meaningfully on screen; leaving once the section's
      // bottom edge climbs into the upper third of the viewport.
      const onScreen = rect.top < vh * 0.85 && rect.bottom > 0;
      const leaving = rect.bottom < vh * 0.4;

      node.classList.toggle("is-entering", onScreen && !leaving);
      node.classList.toggle(
        "is-leaving",
        leaving && rect.bottom > -rect.height,
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
