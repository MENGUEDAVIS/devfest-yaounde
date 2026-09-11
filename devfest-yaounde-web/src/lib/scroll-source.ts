"use client";

/**
 * The single seam between "the page's scroll position" and everything that
 * needs to read it (the floating overlay scrollbar) or hold it still (every
 * modal, sheet and the preloader).
 *
 * Native scroll only. This module used to switch between native scroll and a
 * momentum-scroll library (`docs/decisions/0007-smooth-scroll.md`), which was
 * removed outright (ADR 0053): it broke wheel/keyboard/find-on-page scrolling
 * in ways that only showed up in real use, and the fix was to stop driving
 * scroll with a library at all rather than patch around it further. The seam
 * stays, because the floating scrollbar, the lock-count nesting and the API
 * below are all still worth having on their own — nothing here depends on
 * there being more than one possible driver.
 *
 * Shaped as a `useSyncExternalStore` source rather than an effect that
 * setStates per scroll event: that's React's documented way to read
 * external, non-reactive state, and keeps the read out of the render path.
 * The snapshot is CACHED and only replaced on a real change — returning a
 * fresh object each call would loop forever.
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

const listeners = new Set<() => void>();

/**
 * How many overlays currently hold the scroll locked.
 *
 * A COUNT, not a boolean: overlays nest — a modal can open over the
 * preloader — and releasing the inner one must not hand scrolling back while
 * the outer one is still up.
 */
let lockCount = 0;

export function getScrollSnapshot(): ScrollSnapshot {
  const scrollY = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = window.innerHeight;

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
 * Subscribe to anything that can change the snapshot.
 *
 * Resize matters because the thumb size depends on the viewport/content
 * ratio; the ResizeObserver catches content-height changes (images loading,
 * accordions opening, a speaker detail panel) that fire neither scroll nor
 * resize.
 */
export function subscribeScroll(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });

  const observer = new ResizeObserver(onChange);
  observer.observe(document.documentElement);
  observer.observe(document.body);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    observer.disconnect();
  };
}

/**
 * Jump/scroll the page to an absolute Y offset.
 *
 * `smooth` picks native's own `behavior`. `immediate` (i.e. `!smooth`)
 * matters for a scrollbar DRAG specifically: the thumb has to track the
 * pointer 1:1, and an eased scroll fighting a drag that keeps moving the
 * target reads as laggy rather than smooth.
 */
export function scrollToY(y: number, smooth: boolean) {
  window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}

/**
 * Freeze the page behind an overlay, and restore it exactly on release.
 *
 * Lives here rather than in the overlay component so every overlay — the
 * preloader, `Modal`, `BottomSheet`, the admin drawer — shares one lock
 * rather than four slightly different ones. Nesting is the reason it needs
 * to be shared at all: `lockCount` above is what lets an inner overlay close
 * without handing scroll back while an outer one is still open.
 *
 * Returns the release function. Calling it twice is safe.
 *
 * Scroll position: `overflow: hidden` on <body> preserves it (unlike the
 * `position: fixed` technique, which collapses the page to the top and needs
 * the offset re-applied). The Y is still captured and re-applied on release
 * as a belt-and-braces — cheap insurance against `overflow` ever failing to
 * hold the position exactly.
 */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  const y = window.scrollY;
  const previousOverflow = document.body.style.overflow;
  const previousRootOverflow = document.documentElement.style.overflow;
  const previousPaddingRight = document.body.style.paddingRight;

  // The overlay scrollbar is a floating element, not a native gutter, so
  // there is normally nothing to compensate for — but if the native bar is
  // in play (no JS overlay, or a browser that ignores it) hiding overflow
  // would otherwise shift the whole page sideways.
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  if (gutter > 0) {
    document.body.style.paddingRight = `${gutter}px`;
  }
  document.body.style.overflow = "hidden";
  /*
   * <html> too, not just <body>. The document element is the scrolling
   * element here, so `overflow: hidden` on the body alone leaves the page
   * scrollable — verified: the background still moved 400px under a
   * "locked" overlay.
   */
  document.documentElement.style.overflow = "hidden";
  lockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    document.body.style.overflow = previousOverflow;
    document.documentElement.style.overflow = previousRootOverflow;
    document.body.style.paddingRight = previousPaddingRight;
    // Only the LAST release hands scrolling back; an inner overlay closing
    // must not unlock the page under an outer one.
    if (lockCount > 0) return;
    // `"auto"` so releasing never animates the page back into place.
    window.scrollTo({ top: y, behavior: "auto" });
  };
}
