"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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
              >
                <div className="grid h-full grid-cols-1 overflow-hidden rounded-lg border-2 border-black02 bg-black02 shadow-[0_8px_0_0_var(--color-black02)] md:grid-cols-2">
                  <MorphedImageFrame
                    src={person.photoUrl}
                    alt={active ? person.name : ""}
                    aspectRatio="4/5"
                    className="h-full rounded-none border-0"
                  />
                  <div className="flex items-center overflow-y-auto bg-black02 px-7 py-8 scroll-on-dark sm:px-10 sm:py-10">
                    <PersonDetail person={person} tone="dark" size="roomy" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tap targets over the foreshadowed slides — the way touch users
            (who don't get drag) move the reel without hunting for buttons. */}
        {safeIndex > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("prev")}
            className="absolute inset-x-0 top-0 h-[12%] cursor-pointer"
          />
        )}
        {safeIndex < count - 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("next")}
            className="absolute inset-x-0 bottom-0 h-[12%] cursor-pointer"
          />
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={safeIndex === 0}
            aria-label={t("prev")}
            className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:bg-offwhite motion-reduce:transform-none"
          >
            <CaretUp size={24} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={safeIndex === count - 1}
            aria-label={t("next")}
            className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:bg-offwhite motion-reduce:transform-none"
          >
            <CaretDown size={24} weight="bold" />
          </button>
        </div>

        <div className="text-right">
          <p
            aria-live="polite"
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02"
          >
            {t("position", { current: safeIndex + 1, total: count })}
          </p>
          <p className="mt-1 font-mono text-caption text-black02/50">
            {t("dragHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
