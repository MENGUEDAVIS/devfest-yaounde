"use client";

import { useEffect, useRef } from "react";

/** How fast the ring chases the pointer. 1 = instant, lower = more lag. */
const EASE = 0.18;
/** Below this distance the loop parks itself rather than burning frames. */
const REST_EPSILON = 0.05;

const INTERACTIVE =
  'a[href], button, [role="button"], [role="radio"], input[type="checkbox"], input[type="radio"], select, summary, .scramble, [data-cursor="grab"]';
const TEXTUAL =
  "input, textarea, [contenteditable=''], [contenteditable='true']";

/**
 * Custom cursor — PHASE11 §2.
 *
 * Two parts: a small solid dot pinned exactly to the pointer, and a larger
 * ring built from the logo's two angled brackets that CHASES it with a little
 * lag. Over an interactive element the ring grows and its brackets close in
 * around the target; over text it gets out of the way entirely.
 *
 * The dot is deliberately at the real pointer position with no easing. If the
 * only visible cursor lagged behind the true hit point, every click would
 * feel a few pixels off — a lagging cursor is a decoration, not a pointer.
 *
 * WHEN THIS DOES NOT RUN AT ALL (all three are hard gates, not degradations):
 *  - Coarse pointers / no hover: touch devices keep the native behaviour.
 *    A custom cursor on a phone is invisible cost.
 *  - `prefers-reduced-motion`: no chase, no lag, native cursor.
 *  - No JS: `.has-custom-cursor` is only added by this component, and the
 *    native cursor is only hidden under that class, so the cursor can never
 *    be hidden with nothing drawn in its place.
 *
 * Both media queries are watched live, so plugging in a mouse, switching to
 * touch, or toggling the OS motion setting takes effect without a reload.
 *
 * Position is written to CSS custom properties inside a rAF loop rather than
 * held in React state: this fires on every pointer move, and re-rendering a
 * component tree at pointer frequency for a decorative dot is not a trade
 * worth making. The loop also parks itself once the ring catches up, so an
 * idle page schedules no frames at all.
 */
export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const fineQuery = window.matchMedia("(pointer: fine) and (hover: hover)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf: number | null = null;
    let active = false;
    // Target (true pointer) and current (eased ring) positions.
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const tick = () => {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;
      root.style.setProperty("--cursor-x", `${tx}px`);
      root.style.setProperty("--cursor-y", `${ty}px`);
      root.style.setProperty("--ring-x", `${cx}px`);
      root.style.setProperty("--ring-y", `${cy}px`);

      // Park the loop once the ring has effectively arrived.
      if (
        Math.abs(tx - cx) < REST_EPSILON &&
        Math.abs(ty - cy) < REST_EPSILON
      ) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    function onPointerMove(e: PointerEvent) {
      // A mouse event on a hybrid device shouldn't wake the cursor for a
      // finger tap that follows.
      if (e.pointerType === "touch") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!root!.dataset.visible) root!.dataset.visible = "true";
      kick();
    }

    function onOver(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const overText = !!target.closest(TEXTUAL);
      const overInteractive = !overText && !!target.closest(INTERACTIVE);
      root!.dataset.state = overText
        ? "text"
        : overInteractive
          ? "interactive"
          : "default";
    }

    function onLeave() {
      delete root!.dataset.visible;
    }
    function onDown() {
      root!.dataset.pressed = "true";
    }
    function onUp() {
      delete root!.dataset.pressed;
    }

    function enable() {
      document.documentElement.classList.add("has-custom-cursor");
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerover", onOver, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      active = true;
    }

    function disable() {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      delete root!.dataset.visible;
      active = false;
    }

    function sync() {
      const shouldRun = fineQuery.matches && !motionQuery.matches;
      if (shouldRun && !active) enable();
      else if (!shouldRun && active) disable();
    }

    sync();
    fineQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);

    return () => {
      fineQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
      disable();
    };
  }, []);

  return (
    <div ref={rootRef} className="cursor-layer" aria-hidden>
      <div className="cursor-dot" />
      <div className="cursor-ring">
        {/* The logo's angled-bracket motif, unicolor and themed. Two chevrons
            facing each other — the same "><" the wordmark is built from. */}
        <svg viewBox="0 0 40 40" fill="none" aria-hidden>
          <path
            className="cursor-bracket cursor-bracket-l"
            d="M15 8 L6 20 L15 32"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="cursor-bracket cursor-bracket-r"
            d="M25 8 L34 20 L25 32"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
