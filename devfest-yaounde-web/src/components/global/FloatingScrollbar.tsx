"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getScrollSnapshot,
  getServerScrollSnapshot,
  scrollToY,
  subscribeScroll,
} from "@/lib/scroll-source";

const MIN_THUMB_PX = 48;
const IDLE_FADE_MS = 1400;

/**
 * Floating overlay scrollbar (PHASE7 §1b).
 *
 * Overlays the content — the page keeps its full width and scrolls *behind*
 * this, instead of being inset by a native scrollbar gutter. Yellow-family
 * per DESIGN.md §2.5.
 *
 * It is a real control, not decoration: drag the thumb, click the track to
 * jump, and it carries proper `role="scrollbar"` semantics. The native bar
 * is only hidden once this mounts (it adds `.has-overlay-scrollbar` to
 * <html>), so if JS never runs the user still gets a normal themed native
 * scrollbar rather than no scrollbar at all.
 *
 * Position comes from `@/lib/scroll-source` via `useSyncExternalStore` —
 * the single seam that would point at Lenis instead if the momentum-scroll
 * ADR (docs/decisions/0007-smooth-scroll.md) is approved.
 *
 * Desktop only (`lg:block`): touch platforms have their own overlay
 * scrollbars and no pointer to grab this with.
 */
export function FloatingScrollbar() {
  const { scrollY, scrollHeight, clientHeight } = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startY: number; startScroll: number } | null>(
    null,
  );
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);

  // Mark <html> so globals.css hides the native bar only when this is live
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-overlay-scrollbar");
    return () => root.classList.remove("has-overlay-scrollbar");
  }, []);

  // Briefly surface the bar while scrolling, then let it fade back.
  // setState here is in an event callback, not an effect body.
  useEffect(() => {
    const onScroll = () => {
      setActive(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (!draggingRef.current) setActive(false);
      }, IDLE_FADE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Derived purely from the subscribed snapshot — no state, no effect.
  const distance = Math.max(scrollHeight - clientHeight, 0);
  if (distance <= 1 || clientHeight === 0) return null;

  const rawPct = (clientHeight / scrollHeight) * 100;
  const minPct = (MIN_THUMB_PX / clientHeight) * 100;
  const thumbPct = Math.min(Math.max(rawPct, minPct), 100);
  const progress = Math.min(Math.max(scrollY / distance, 0), 1);
  const offsetPct = progress * (100 - thumbPct);

  function handleThumbPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = { startY: e.clientY, startScroll: scrollY };
    setActive(true);
  }

  function handleThumbPointerMove(e: React.PointerEvent) {
    const drag = draggingRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;

    const trackPx = track.clientHeight;
    const travel = trackPx - (thumbPct / 100) * trackPx;
    if (travel <= 0) return;

    const deltaRatio = (e.clientY - drag.startY) / travel;
    scrollToY(drag.startScroll + deltaRatio * distance, false);
  }

  function handleThumbPointerUp(e: React.PointerEvent) {
    const target = e.target as Element;
    if (target.hasPointerCapture?.(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    draggingRef.current = null;
  }

  /** Click anywhere on the track to jump that far down the page. */
  function handleTrackPointerDown(e: React.PointerEvent) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const thumbRatio = thumbPct / 100;
    const target = (ratio - thumbRatio / 2) / (1 - thumbRatio);
    scrollToY(Math.min(Math.max(target, 0), 1) * distance, true);
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      className={`fixed right-1.5 top-2 z-60 hidden w-2.5 rounded-pill transition-opacity duration-300 lg:block ${
        active ? "opacity-100" : "opacity-45"
      }`}
      style={{ height: "calc(100svh - 1rem)" }}
    >
      <div
        role="scrollbar"
        aria-orientation="vertical"
        aria-label="Page scroll"
        aria-controls="main-content"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
        className="absolute inset-x-0 cursor-grab rounded-pill border-2 border-black02 bg-yellow transition-colors duration-200 hover:bg-yellow-halftone active:cursor-grabbing"
        style={{ height: `${thumbPct}%`, top: `${offsetPct}%` }}
      />
    </div>
  );
}
