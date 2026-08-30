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
 * Custom cursor — PHASE11 §2, reshaped and recoloured in PHASE12 §3.
 *
 * Two parts: a small solid dot pinned exactly to the pointer, and a larger
 * ROUNDED ARROW that CHASES it with a little lag. Over an interactive element
 * the arrow grows and softens into a ring that frames the target; over text
 * it gets out of the way entirely.
 *
 * SHAPE: a tail-less pointer with smooth rounded corners — a friendly take on
 * the classic mouse arrow. It replaced the angled-bracket mark, which read as
 * a logo fragment stuck to the pointer rather than as a cursor.
 *
 * COLOUR: the CONTRAST of the active theme (DESIGN.md §2.5) — Blue theme
 * gets a Red cursor, Yellow gets Green, and vice versa. Using the active
 * family would put a yellow cursor on the Pastel Yellow wash, which is the
 * visibility problem the pairing exists to remove. It follows
 * `--color-contrast`, so a theme switch flips it with no JS involved.
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
      {/* Framing ring, only visible over interactive targets. */}
      <div className="cursor-halo" />
      <div className="cursor-ring">
        {/*
          Tail-less rounded arrow — a soft, friendly pointer. Drawn as a
          stroked path with round joins and caps rather than a sharp filled
          polygon, which is what gives it the rounded edges; the fill closes
          it into a solid shape. Unicolor, and `currentColor` is what lets the
          theme's contrast colour drive it from CSS alone.
        */}
        <svg viewBox="0 0 28 28" aria-hidden>
          <path
            className="cursor-arrow"
            d="M 9 5.5 L 25.6 12.6 L 19.83 14.34 Q 16.3 15.4 14.36 18.55 L 11.2 23.7 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
