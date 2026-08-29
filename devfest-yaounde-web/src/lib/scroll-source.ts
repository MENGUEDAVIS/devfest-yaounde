"use client";

import type Lenis from "lenis";

/**
 * The single seam between "what is driving the page scroll" and everything
 * that needs to read it (the floating overlay scrollbar).
 *
 * `docs/decisions/0007-smooth-scroll.md` was APPROVED, so Lenis now drives
 * scrolling on pointer-capable desktop browsers when the visitor has not
 * asked for reduced motion. Everywhere else — touch devices, reduced-motion
 * users, and before/if Lenis ever fails to initialise — this falls straight
 * through to native scroll. Consumers don't know or care which is active.
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

/** Set by the LenisProvider while smooth scrolling is active; null otherwise. */
let activeLenis: Lenis | null = null;
const listeners = new Set<() => void>();

export function setActiveLenis(instance: Lenis | null) {
  activeLenis = instance;
  // Thumb geometry may differ the instant the driver changes
  listeners.forEach((fn) => fn());
}

export function getScrollSnapshot(): ScrollSnapshot {
  // Lenis keeps the real document scrolled (it doesn't transform a wrapper),
  // so window.scrollY stays authoritative under both drivers. Reading it
  // rather than Lenis's internal value keeps this correct if Lenis is
  // disabled mid-session.
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
 * Native `scroll` still fires under Lenis (it scrolls the real document), so
 * one listener covers both drivers. Resize matters because the thumb size
 * depends on the viewport/content ratio; the ResizeObserver catches
 * content-height changes (images loading, accordions opening, a speaker
 * detail panel) that fire neither scroll nor resize.
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
 * Routed through Lenis when it's driving, so a scrollbar drag or track click
 * doesn't fight the smooth-scroll loop. `immediate` bypasses easing for
 * drags, where the thumb must track the pointer 1:1.
 */
export function scrollToY(y: number, smooth: boolean) {
  if (activeLenis) {
    activeLenis.scrollTo(y, { immediate: !smooth });
    return;
  }
  window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}
