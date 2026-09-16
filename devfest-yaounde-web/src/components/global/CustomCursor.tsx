"use client";

import { useEffect, useRef } from "react";

/** How fast the ring chases the pointer. 1 = instant, lower = more lag. */
const EASE = 0.18;
/**
 * How fast the IMAGE card chases the pointer (see the image state below).
 * Lazier than the arrow on purpose: a 240px picture that tracked as tightly as
 * a 30px arrow would read as glued on, and the slight drag is what makes it
 * feel like an object being carried.
 */
const IMAGE_EASE = 0.11;
/**
 * Half the image card's box (320×200 — see `.cursor-image` in globals.css),
 * so it can be kept fully on screen. Wider than it once was: the card was
 * reading as cropped on genuinely landscape photos, and a boxier frame was
 * the reason — see the note on `StatCounter`'s image sizing.
 */
const IMAGE_HALF_W = 160;
const IMAGE_HALF_H = 100;
/** The lean a zone gets when it doesn't specify `data-cursor-tilt`. */
const DEFAULT_IMAGE_TILT_DEG = -4;

/**
 * How fast the TEXT CARD chases the pointer (PHASE22 §A2 — sponsor
 * name+blurb popups). Its own, separate eased point rather than sharing the
 * image's: the two are never up at once, but keeping them independent means
 * this can be tuned (or the whole card feature removed) without touching
 * the already-shipped, already-verified image reveal at all.
 */
const CARD_EASE = 0.14;
/**
 * Half the text card's ASSUMED box (see `.cursor-card` in globals.css) —
 * used only to keep the reveal fully on screen near an edge. The real box
 * is content-sized (a short name, an optional one-line blurb), so this is a
 * generous estimate rather than an exact measurement; being slightly
 * conservative here only means the card sits a little further from the
 * true edge than it strictly had to, never that it overflows one.
 */
const CARD_HALF_W = 140;
const CARD_HALF_H = 56;
/** The lean a card zone gets when it doesn't specify `data-cursor-tilt`. */
const DEFAULT_CARD_TILT_DEG = -2;

/** Below this distance the loop parks itself rather than burning frames. */
const REST_EPSILON = 0.05;

/**
 * An element that turns the cursor into a picture while hovered. The value is
 * the image URL. Checked BEFORE the interactive/text states, so a zone wins
 * over anything nested in it.
 */
const IMAGE_ZONE = "[data-cursor-image]";
/**
 * An element that turns the cursor into a small name+blurb card while
 * hovered — the sponsor popup (PHASE22 §A2). The value is the name;
 * `data-cursor-card-body` on the same element is the optional blurb line.
 * Mutually exclusive with `IMAGE_ZONE` by convention (an element is one
 * kind of reveal zone or the other, never both) — checked second, so an
 * image zone nested inside a card zone would still win, though nothing
 * does that today.
 */
const CARD_ZONE = "[data-cursor-card]";

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
 * IMAGE STATE (PHASE21 §C2). Any element carrying `data-cursor-image="<url>"`
 * is a hover zone: while the pointer is inside it, the arrow and dot fade out
 * and a picture card takes their place, revealed with a clip + scale and
 * dismissed with the reverse when the pointer leaves. It is the SAME cursor —
 * same layer, same rAF loop, same live media gates — with a second eased
 * point for the card, so it inherits every guarantee above for free: it
 * never runs on touch, never runs under reduced motion (callers show the
 * image inline there instead), and can never leave the page without a cursor.
 * The card's target is clamped so it stays fully on screen near the edges.
 *
 * The zone can also carry `data-cursor-tilt="<deg>"` — a static lean read
 * once per zone-entry (not animated in from here) and written to
 * `--image-tilt`, so different zones on the same page can alternate which
 * way their card leans. Falls back to a fixed -4deg for a zone without one.
 * Once revealed, the card also gets a small continuous bob — see
 * `.cursor-image-float` in globals.css, on its own nested element for the
 * same reason `.hero-sticker`'s bob is: an animated `transform` fully
 * overrides any other `transform` on the SAME element for as long as it
 * runs, so the bob can never share an element with the position/tilt or the
 * reveal scale without one silently erasing the other.
 *
 * TEXT CARD STATE (PHASE22 §A2). `[data-cursor-card="<name>"]` is the same
 * idea, adapted for the sponsor popup: a small name+blurb card instead of a
 * picture. Deliberately a SEPARATE, parallel system (own eased point, own
 * CSS vars, own DOM) rather than a refactor of the image state to share
 * one — the two are never shown at once, but keeping them independent means
 * either can be changed without re-verifying the other. `data-cursor-tilt`
 * works the same way here as it does on an image zone.
 *
 * Position is written to CSS custom properties inside a rAF loop rather than
 * held in React state: this fires on every pointer move, and re-rendering a
 * component tree at pointer frequency for a decorative dot is not a trade
 * worth making. The loop also parks itself once the ring catches up, so an
 * idle page schedules no frames at all.
 */
export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cardTitleRef = useRef<HTMLParagraphElement>(null);
  const cardBodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    const cardTitle = cardTitleRef.current;
    const cardBody = cardBodyRef.current;
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
    // The image card's own eased point — lazier than the arrow's.
    let ix = tx;
    let iy = ty;
    // The text card's own eased point — independent of the image's.
    let jx = tx;
    let jy = ty;

    const tick = () => {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;
      // Clamped target, so a zone near the viewport edge never pushes half
      // the picture off screen.
      const itx = Math.min(
        Math.max(tx, IMAGE_HALF_W + 8),
        window.innerWidth - IMAGE_HALF_W - 8,
      );
      const ity = Math.min(
        Math.max(ty, IMAGE_HALF_H + 8),
        window.innerHeight - IMAGE_HALF_H - 8,
      );
      ix += (itx - ix) * IMAGE_EASE;
      iy += (ity - iy) * IMAGE_EASE;
      // Same clamping idea, the text card's own (smaller, assumed) box.
      const jtx = Math.min(
        Math.max(tx, CARD_HALF_W + 8),
        window.innerWidth - CARD_HALF_W - 8,
      );
      const jty = Math.min(
        Math.max(ty, CARD_HALF_H + 8),
        window.innerHeight - CARD_HALF_H - 8,
      );
      jx += (jtx - jx) * CARD_EASE;
      jy += (jty - jy) * CARD_EASE;
      root.style.setProperty("--cursor-x", `${tx}px`);
      root.style.setProperty("--cursor-y", `${ty}px`);
      root.style.setProperty("--ring-x", `${cx}px`);
      root.style.setProperty("--ring-y", `${cy}px`);
      root.style.setProperty("--image-x", `${ix}px`);
      root.style.setProperty("--image-y", `${iy}px`);
      root.style.setProperty("--card-x", `${jx}px`);
      root.style.setProperty("--card-y", `${jy}px`);

      // Park the loop once EVERY chaser has effectively arrived.
      if (
        Math.abs(tx - cx) < REST_EPSILON &&
        Math.abs(ty - cy) < REST_EPSILON &&
        Math.abs(itx - ix) < REST_EPSILON &&
        Math.abs(ity - iy) < REST_EPSILON &&
        Math.abs(jtx - jx) < REST_EPSILON &&
        Math.abs(jty - jy) < REST_EPSILON
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

      const zone = target.closest<HTMLElement>(IMAGE_ZONE);
      const src = zone?.dataset.cursorImage;
      if (src && image) {
        // Swap the picture only on a real change: reassigning the same URL
        // restarts decoding in some browsers and flickers the card. The src
        // is deliberately NOT cleared on leave, so the dismiss transition
        // plays over the picture instead of over an empty box.
        if (image.getAttribute("src") !== src) image.setAttribute("src", src);
        // Read once per zone-entry, not eased or animated — a static lean
        // per zone, so different figures on the same page can alternate.
        const tilt = zone.dataset.cursorTilt ?? String(DEFAULT_IMAGE_TILT_DEG);
        root!.style.setProperty("--image-tilt", `${tilt}deg`);
        if (root!.dataset.state !== "image") {
          // Start the card where the pointer is, not wherever it was parked
          // last time — otherwise it flies across the page to get here.
          ix = tx;
          iy = ty;
          kick();
        }
        root!.dataset.state = "image";
        return;
      }

      const cardZone = target.closest<HTMLElement>(CARD_ZONE);
      const title = cardZone?.dataset.cursorCard;
      if (title && cardTitle && cardBody) {
        if (cardTitle.textContent !== title) cardTitle.textContent = title;
        const body = cardZone.dataset.cursorCardBody ?? "";
        if (cardBody.textContent !== body) cardBody.textContent = body;
        const tilt =
          cardZone.dataset.cursorTilt ?? String(DEFAULT_CARD_TILT_DEG);
        root!.style.setProperty("--card-tilt", `${tilt}deg`);
        if (root!.dataset.state !== "card") {
          // Same reasoning as the image zone: start where the pointer
          // already is, not wherever the card last parked.
          jx = tx;
          jy = ty;
          kick();
        }
        root!.dataset.state = "card";
        return;
      }

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
      delete root!.dataset.state;
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
      {/*
        The picture card for `[data-cursor-image]` zones. Decorative (the
        whole layer is aria-hidden) — the figure it illustrates is right
        there in the page. No src until a zone is first entered.
      */}
      <div className="cursor-image">
        {/*
          The bob lives on its OWN element — see the doc comment above on
          why it cannot share `.cursor-image` (position + tilt) or the `img`
          (reveal scale) without one animation erasing the other.
        */}
        <div className="cursor-image-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imageRef} alt="" decoding="async" />
        </div>
      </div>
      {/*
        The text card for `[data-cursor-card]` zones — the sponsor popup.
        Same "decorative, no content until a zone is entered" reasoning as
        the picture card above; the sponsor's own logo and (for the
        touch/reduced-motion fallback) inline text carry this information
        for anyone this layer cannot reach.
      */}
      <div className="cursor-card">
        <div className="cursor-card-float">
          <div className="cursor-card-inner">
            <p ref={cardTitleRef} className="cursor-card-title" />
            <p ref={cardBodyRef} className="cursor-card-body" />
          </div>
        </div>
      </div>
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
