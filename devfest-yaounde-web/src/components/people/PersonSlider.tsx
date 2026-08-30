"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { PersonDetail, type PersonLike } from "./PersonDetail";

/** Past this much vertical drag, releasing commits to the next slide. */
const DRAG_COMMIT_PX = 70;
/** px/ms. Above this a release is a FLICK and momentum carries extra slides. */
const FLICK_VELOCITY = 0.55;
/** Cap on momentum, so a hard flick doesn't fling past the whole reel. */
const MAX_MOMENTUM_SLIDES = 3;
/** Drag follows the finger at less than 1:1 — the reel feels weighted. */
const DRAG_RESISTANCE = 0.6;

export interface SliderPerson extends PersonLike {
  photoUrl: string;
}

export interface PersonSliderProps {
  people: SliderPerson[];
  /** Controlled index so the page can preserve focus across a view switch. */
  index: number;
  onIndexChange: (next: number) => void;
  emptyLabel: string;
  /** Dismiss the lockup — returns the page to grid view. */
  onClose: () => void;
  /** Accessible name + close-button label for the takeover. */
  title: string;
  closeLabel: string;
}

/**
 * VERTICAL CINEMA STAGE — PHASE10 §7, moved into a full-page LOCKUP in
 * PHASE13 §2.
 *
 * A vertical reel: one person centred at full size, the previous slide
 * foreshadowed ABOVE and the next BELOW, both scaled back and dimmed so the
 * stack reads as depth rather than as three equal cards. The grid stays
 * deliberately plain by contrast — the slider is the cinematic presentation
 * of the same people, not a second grid.
 *
 * WHY THE LOCKUP. Through PHASE10-12 this lived inside a page section, and
 * every phase produced another sizing complaint: content cropped, then a
 * scrollbar, then type tiers to make it fit, then a photo too big, then too
 * small. The root cause was that the stage had to negotiate for height with
 * a page heading, a filter row and a footer. Rendering it as a locked
 * takeover removes the negotiation: the stage owns the viewport below the
 * navbar, so there is finally enough room to size the slide generously and
 * have the content simply fit.
 *
 * ALIGNMENT is the fix that mattered. Positions are computed in CSS from
 * `--slide-h` and `--slide-gap` (see `.cinema-track` in motion.css) rather
 * than from measured pixel values, so every slide lands on the same centre
 * line at every viewport width, with nothing to re-measure on resize and no
 * measurement pass during render.
 *
 * MOMENTUM: release velocity is sampled from the last pointer move. A slow
 * drag past the commit threshold advances one slide; a flick carries two or
 * three and decelerates into place on the bouncy easing.
 *
 * Vertical drag is bound to mouse and pen only. On touch, a vertical gesture
 * inside a tall stage is how you scroll the page — claiming it would trap
 * anyone who scrolled onto the slider. Touch gets the prev/next buttons and
 * the tappable foreshadowed slides instead, and `touch-action: pan-y` keeps
 * page scrolling untouched.
 *
 * Reduced motion: the settle transition is dropped (`motion-reduce`), so
 * slides swap instantly, and momentum is never applied — a release either
 * commits one slide or snaps back.
 *
 * The index CLAMPS at both ends rather than wrapping: a reel you can see the
 * ends of shouldn't teleport from the last person back to the first.
 */
export function PersonSlider({
  people,
  index,
  onIndexChange,
  emptyLabel,
  onClose,
  title,
  closeLabel,
}: PersonSliderProps) {
  const t = useTranslations("common.views");
  const headingId = useId();
  const [dragPx, setDragPx] = useState(0);
  // Dragging affects rendered output (the cursor), so it's state, not a ref —
  // refs must never be read during render.
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    startY: number;
    pointerId: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const count = people.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      onIndexChange(Math.max(0, Math.min(count - 1, next)));
    },
    [count, onIndexChange],
  );
  const go = useCallback(
    (dir: 1 | -1, slides = 1) => goTo(index + dir * slides),
    [goTo, index],
  );

  // Arrow keys when the stage has focus. Up/Down are the primary axis now;
  // Left/Right stay bound so muscle memory from the old slider still works.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(count - 1);
      }
    }
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [go, goTo, count]);

  if (count === 0) {
    return (
      <Modal
        open
        onClose={onClose}
        variant="takeover"
        browserFullscreen
        closeLabel={closeLabel}
      >
        <p className="m-auto rounded-lg border-2 border-dashed border-offwhite/30 px-7 py-16 text-center text-body-l text-offwhite/75">
          {emptyLabel}
        </p>
      </Modal>
    );
  }

  const safeIndex = Math.min(index, count - 1);

  function onPointerDown(e: React.PointerEvent) {
    /*
     * Touch drags now, where it used to bail out.
     *
     * The old rule existed because the slider was an in-page section: a
     * vertical swipe inside it was how you scrolled the page, so claiming
     * that gesture would have trapped anyone who scrolled onto it. In a
     * full-screen lockup there IS no page scroll behind it — it is locked —
     * so the gesture is unambiguously the reel's, on every input type.
     */
    if ((e.target as Element).closest("a,button")) return;
    drag.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dt = e.timeStamp - d.lastT;
    // Guard the divide: coalesced moves can share a timestamp.
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragPx((e.clientY - d.startY) * DRAG_RESISTANCE);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    /*
     * The delta comes from the last POINTERMOVE, not from this event.
     *
     * Touch gestures here end in `pointercancel`, not `pointerup`, and a
     * cancel carries `clientY: 0` — so reading the end event's coordinate
     * made every touch drag compute a large NEGATIVE dy no matter which way
     * the finger actually went, and the reel always advanced forwards.
     * `lastY` is the last position we genuinely observed, which is correct
     * for both endings.
     */
    const dy = d.lastY - d.startY;
    const speed = Math.abs(d.velocity);
    const el = e.currentTarget as Element;
    if (el.hasPointerCapture?.(d.pointerId)) {
      el.releasePointerCapture(d.pointerId);
    }
    drag.current = null;
    setDragging(false);
    setDragPx(0);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Momentum: a fast flick carries further than the one slide a slow drag
    // commits to. Dragging DOWN reveals the slide above, hence the negated
    // direction.
    const flicked = !reduced && speed > FLICK_VELOCITY;
    if (Math.abs(dy) > DRAG_COMMIT_PX || flicked) {
      const slides = flicked
        ? Math.min(MAX_MOMENTUM_SLIDES, 1 + Math.floor(speed / FLICK_VELOCITY))
        : 1;
      go(dy < 0 ? 1 : -1, slides);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      variant="takeover"
      browserFullscreen
      labelledBy={headingId}
      closeLabel={closeLabel}
    >
      {/* Names the dialog without adding a visible heading that would eat
          the height the lockup exists to give back to the slide. */}
      <h2 id={headingId} className="sr-only">
        {title}
      </h2>
      <div
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("position", { current: safeIndex + 1, total: count })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-cursor="grab"
        className="cinema-stage relative touch-none select-none overflow-hidden rounded-lg"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div
          className={`cinema-track ${dragging ? "is-dragging" : ""}`}
          style={{
            ["--i" as string]: safeIndex,
            ["--drag" as string]: dragPx,
          }}
        >
          {people.map((person, i) => {
            const active = i === safeIndex;
            const adjacent = Math.abs(i - safeIndex) === 1;
            return (
              <div
                key={person.id}
                // Only the centred slide is in the a11y tree and tab order —
                // the foreshadowed ones are a depth cue, and announcing every
                // person on the reel at once would be noise.
                inert={!active}
                aria-hidden={!active}
                className={`cinema-slide ${active ? "is-active" : ""} ${
                  adjacent ? "is-adjacent" : ""
                }`}
                /* Alternating tilt on the polaroid, +/- by slide index —
                   set here rather than in CSS :nth-child so it follows the
                   PERSON, not their DOM position, and stays stable when a
                   filter changes the list. */
                style={{
                  ["--polaroid-tilt" as string]: `${i % 2 === 0 ? 2.5 : -2.5}deg`,
                  // Counter-tilt: the card leans one way, the print inside it
                  // the other, so they read as two objects rather than one
                  // steeply slanted block.
                  ["--slide-tilt" as string]: `${i % 2 === 0 ? -0.8 : 0.8}deg`,
                }}
              >
                {/*
                    `grid-rows-[minmax(0,1fr)]` makes the row height DEFINITE.
                    Without it the row is sized by its content, so the
                    polaroid's `height: 100%` had nothing to resolve against
                    and fell back to the image's intrinsic height — which on
                    a 1280px-wide screen was taller than the slide, and the
                    overflow was silently clipped. A definite row is what
                    lets the print shrink to fit.
                  */}
                <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)] items-center gap-6 overflow-hidden rounded-lg border-2 border-offwhite/15 bg-black02 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] sm:p-8 md:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)] md:grid-rows-[minmax(0,1fr)] md:gap-8">
                  {/* Mobile: a circle avatar. It costs a fraction of the
                      height a polaroid does, which is what leaves room for
                      the whole detail to fit on a phone. */}
                  <MorphedImageFrame
                    src={person.photoUrl}
                    alt={active ? person.name : ""}
                    shape="circle"
                    aspectRatio="1/1"
                    className="slide-avatar mx-auto h-24 w-24 shrink-0 border-2 border-offwhite/30 sm:h-28 sm:w-28 md:hidden"
                  />

                  {/* Desktop: the polaroid — thick lower border, slight tilt,
                      detached from the slide's edges by the padding. Hidden
                      below `md` from motion.css, not with a utility here —
                      see the note on that rule. */}
                  <div className="polaroid min-h-0">
                    <MorphedImageFrame
                      src={person.photoUrl}
                      alt={active ? person.name : ""}
                      aspectRatio="4/5"
                      className="rounded-none border-0"
                    />
                  </div>
                  {/*
                    `overflow-y: auto` here is a SAFETY VALVE, not the design.
                    The type tiers in motion.css size the detail to fit the
                    slide at every viewport we measured (down to 1280x720),
                    so no scrollbar appears in normal use. But a silent clip
                    would lose words off the bottom of the card, which is
                    strictly worse than a scrollbar — so if an unforeseen
                    case (heavy browser zoom, a much longer bio) overflows,
                    the text stays reachable. It uses the shared themed pill.
                  */}
                  <div className="max-h-full min-h-0 min-w-0 overflow-y-auto scroll-on-dark">
                    <PersonDetail person={person} tone="dark" size="roomy" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        Controls sit BELOW the slide, not overlaid on it (PHASE12 §6), and
        `shrink-0` keeps them at their natural height so the flex stage above
        absorbs all the remaining space rather than squeezing this row.
      */}
      {/*
        Desktop: a control row under the stage. Mobile: the same controls
        overlaid at the bottom-right of the screen (see the block below), so
        the slide keeps the full height on a phone.
      */}
      <div className="mt-5 hidden shrink-0 items-center justify-between gap-4 md:flex">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={safeIndex === 0}
            aria-label={t("prev")}
            className="flex h-12 w-12 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:bg-offwhite motion-reduce:transform-none sm:h-14 sm:w-14"
          >
            <CaretUp size={22} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={safeIndex === count - 1}
            aria-label={t("next")}
            className="flex h-12 w-12 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:bg-offwhite motion-reduce:transform-none sm:h-14 sm:w-14"
          >
            <CaretDown size={22} weight="bold" />
          </button>
        </div>

        {/* No chip or background behind the counter. It sits on the dark
            scrim now, so the type is OFF WHITE — it was still black02 from
            when this lived on an off-white panel, which made it invisible. */}
        <div className="text-right">
          <p
            aria-live="polite"
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-offwhite"
          >
            {t("position", { current: safeIndex + 1, total: count })}
          </p>
          <p className="mt-0.5 hidden font-mono text-caption text-offwhite/55 sm:block">
            {t("dragHint")}
          </p>
        </div>
      </div>

      {/*
        MOBILE controls — overlaid at the bottom right of the screen, over the
        slide, with the counter beside them. Stacking them under the stage on
        a phone would cost the slide the very height the full-screen lockup
        exists to give it.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-3 md:hidden">
        <p
          aria-live="polite"
          className="font-mono text-mono-tag font-bold uppercase tracking-wide text-offwhite"
        >
          {t("position", { current: safeIndex + 1, total: count })}
        </p>
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={safeIndex === 0}
          aria-label={t("prev")}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] active:translate-y-0.5 active:shadow-none disabled:opacity-35"
        >
          <CaretUp size={20} weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={safeIndex === count - 1}
          aria-label={t("next")}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] active:translate-y-0.5 active:shadow-none disabled:opacity-35"
        >
          <CaretDown size={20} weight="bold" />
        </button>
      </div>
    </Modal>
  );
}
