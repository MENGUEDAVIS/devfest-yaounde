"use client";

/**
 * The single seam between "what is driving the page scroll" and everything
 * that needs to read it (currently the floating overlay scrollbar).
 *
 * Today this is plain native scroll. `docs/decisions/0007-smooth-scroll.md`
 * proposes adopting Lenis for momentum scrolling; that decision is still
 * open and nothing is installed. If it's approved, ONLY this file changes:
 * `subscribe` starts listening to Lenis's `scroll` event and `scrollToY`
 * delegates to Lenis. Consumers keep working untouched — which is why the
 * scrollbar could be built without pre-empting the dependency decision.
 *
 * Shaped as a `useSyncExternalStore` source rather than an effect that
 * setStates on every scroll: that's React's documented way to read external,
 * non-reactive browser state, and it keeps the read out of the render path.
 * The snapshot is CACHED and only replaced when a value actually changes —
 * returning a fresh object each call would loop forever.
 */

export interface ScrollSnapshot {
  scrollY: number;
  scrollHeight: number;
  clientHeight: number;
}

const SERVER_SNAPSHOT: ScrollSnapshot = {
  scrollY: 0,
  scrollHeight: 0,
  clientHeight: 0,
};

let cached: ScrollSnapshot = SERVER_SNAPSHOT;

export function getScrollSnapshot(): ScrollSnapshot {
  const scrollY = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = window.innerHeight;

  // Referential stability: only mint a new object on a real change.
  if (
    cached.scrollY !== scrollY ||
    cached.scrollHeight !== scrollHeight ||
    cached.clientHeight !== clientHeight
  ) {
    cached = { scrollY, scrollHeight, clientHeight };
  }
  return cached;
}

export function getServerScrollSnapshot(): ScrollSnapshot {
  return SERVER_SNAPSHOT;
}

/**
 * Subscribe to anything that can change the snapshot. Resize matters because
 * the thumb size depends on the viewport/content ratio; the ResizeObserver
 * catches content-height changes (images loading, accordions opening, the
 * speaker detail panel) which fire neither scroll nor resize.
 */
export function subscribeScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });

  const observer = new ResizeObserver(onChange);
  observer.observe(document.documentElement);
  observer.observe(document.body);

  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    observer.disconnect();
  };
}

/** Jump/scroll the page to an absolute Y offset. */
export function scrollToY(y: number, smooth: boolean) {
  window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}
