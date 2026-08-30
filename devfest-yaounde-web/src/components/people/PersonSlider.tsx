"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { scrollToY } from "@/lib/scroll-source";
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
}

/**
 * VERTICAL CINEMA STAGE — PHASE10 §7.
 *
 * The previous slider was a horizontal row with two thin edge slivers. This
 * is a vertical reel: one person centred on the stage at full size, with the
 * previous slide foreshadowed ABOVE and the next BELOW, both scaled back and
 * dimmed so the stack reads as depth rather than as three equal cards. The
 * grid stays deliberately plain by contrast — the slider is the cinematic
 * presentation of the same people, not a second grid.
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
}: PersonSliderProps) {
  const t = useTranslations("common.views");
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

  /*
   * The stage is a full viewport tall (PHASE11 §5.2), so if it mounts below
   * a page heading its lower half — including the overlaid controls — starts
   * off screen. This component only mounts when someone deliberately
   * switches to the slider view, so bringing the stage under the chrome is
   * exactly what they asked for.
   *
   * Runs once on mount, and honours reduced motion by jumping instead of
   * animating.
   */
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const chrome = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--chrome-h"),
    );
    const offset = Number.isFinite(chrome) ? chrome * 16 : 208;
    scrollToY(
      node.getBoundingClientRect().top + window.scrollY - offset + 24,
      smooth,
    );
  }, []);

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
      <p className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center text-body-l text-black02/70">
        {emptyLabel}
      </p>
    );
  }

  const safeIndex = Math.min(index, count - 1);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") return; // page scroll stays the page's
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
    const dy = e.clientY - d.startY;
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
    <div>
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
        className="cinema-stage relative touch-pan-y select-none overflow-hidden rounded-lg"
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
                   PHASE11 §5.1. Set here rather than in CSS :nth-child so it
                   follows the PERSON, not their DOM position, and stays
                   stable when a filter changes the list. */
                style={{
                  ["--polaroid-tilt" as string]: `${i % 2 === 0 ? 2 : -2}deg`,
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
                <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)] items-center gap-6 overflow-hidden rounded-lg border-2 border-black02 bg-black02 p-6 shadow-[0_8px_0_0_var(--color-black02)] sm:p-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-8">
                  {/* Polaroid: thick lower border, slight tilt, detached from
                      the slide's edges by the padding above (PHASE11 §5.1). */}
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

        {/*
          Controls are OVERLAID on the stage (PHASE11 §5.2). With the stage
          now a full viewport tall, a control row underneath it would sit
          below the fold — you would have to scroll past the slider to find
          the button that moves the slider.
        */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div className="pointer-events-auto flex items-center gap-3">
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

          <div className="pointer-events-auto rounded-pill border-2 border-black02 bg-offwhite px-4 py-2 text-right">
            <p
              aria-live="polite"
              className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02"
            >
              {t("position", { current: safeIndex + 1, total: count })}
            </p>
            <p className="mt-0.5 hidden font-mono text-caption text-black02/50 sm:block">
              {t("dragHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
