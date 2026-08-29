"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { PersonDetail, type PersonLike } from "./PersonDetail";

/** Past this many px of horizontal drag, we commit to a slide change. */
const DRAG_COMMIT_PX = 60;

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
 * Full-page person spotlight slider — PHASE9 §4.
 *
 * Shows one person large with the previous/next peeking at the edges so it's
 * obvious there's more, and supports all three input modes the brief asked
 * for: **click** (prev/next buttons), **mouse drag**, and **touch swipe** —
 * all via Pointer Events, which unifies mouse/touch/pen in one code path.
 *
 * NO CAROUSEL LIBRARY: drag is ~40 lines of pointer handling here, and the
 * peek layout is a plain translated flex row. A library would have been a
 * new dependency for no capability we don't already have.
 *
 * Reduced motion: the track transition is dropped (motion-reduce) so slides
 * change instantly, and drag never applies inertia — it commits or snaps
 * back, nothing coasts. Auto-advance is not used on this surface at all;
 * a full-page spotlight that moves on its own while you're reading a bio
 * would fight the user rather than help.
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
  const drag = useRef<{ startX: number; pointerId: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = people.length;
  const go = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      onIndexChange((index + dir + count) % count);
    },
    [index, count, onIndexChange],
  );

  // Arrow keys when the slider has focus
  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    }
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [go]);

  if (count === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center text-body-l text-black02/70">
        {emptyLabel}
      </p>
    );
  }

  const current = people[Math.min(index, count - 1)];

  function onPointerDown(e: React.PointerEvent) {
    // Ignore drags that start on a link/button so they stay clickable
    if ((e.target as Element).closest("a,button")) return;
    drag.current = { startX: e.clientX, pointerId: e.pointerId };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setDragPx(e.clientX - drag.current.startX);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const el = e.currentTarget as Element;
    if (el.hasPointerCapture?.(drag.current.pointerId)) {
      el.releasePointerCapture(drag.current.pointerId);
    }
    drag.current = null;
    setDragging(false);
    setDragPx(0);
    if (Math.abs(dx) > DRAG_COMMIT_PX) go(dx < 0 ? 1 : -1);
  }

  const peek = (offset: -1 | 1) => people[(index + offset + count) % count];

  return (
    <div>
      <div
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("position", { current: index + 1, total: count })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // touch-action:pan-y lets the page still scroll vertically while we
        // own the horizontal axis — without it, mobile swipe fights scroll.
        className="relative flex touch-pan-y select-none items-stretch gap-5 overflow-hidden rounded-lg"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        {/* Previous, foreshadowed */}
        {count > 1 && (
          <div
            aria-hidden
            className="hidden w-24 shrink-0 overflow-hidden rounded-lg border-2 border-black02 opacity-40 lg:block"
          >
            <MorphedImageFrame
              src={peek(-1).photoUrl}
              alt=""
              aspectRatio="3/4"
              className="h-full rounded-none border-0"
            />
          </div>
        )}

        {/* Spotlight */}
        <div
          className="min-w-0 flex-1 transition-transform duration-500 ease-out-devfest motion-reduce:transition-none"
          style={{ transform: `translateX(${dragPx * 0.35}px)` }}
        >
          <div className="grid grid-cols-1 overflow-hidden rounded-lg border-2 border-black02 bg-black02 shadow-[0_8px_0_0_var(--color-black02)] md:grid-cols-2">
            <MorphedImageFrame
              src={current.photoUrl}
              alt={current.name}
              aspectRatio="4/5"
              className="rounded-none border-0"
            />
            <div className="flex items-center bg-black02 px-7 py-8 sm:px-10 sm:py-10">
              <PersonDetail person={current} tone="dark" size="roomy" />
            </div>
          </div>
        </div>

        {/* Next, foreshadowed */}
        {count > 1 && (
          <div
            aria-hidden
            className="hidden w-24 shrink-0 overflow-hidden rounded-lg border-2 border-black02 opacity-40 lg:block"
          >
            <MorphedImageFrame
              src={peek(1).photoUrl}
              alt=""
              aspectRatio="3/4"
              className="h-full rounded-none border-0"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("prev")}
            className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
          >
            <CaretLeft size={24} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("next")}
            className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
          >
            <CaretRight size={24} weight="bold" />
          </button>
        </div>

        <div className="text-right">
          <p
            aria-live="polite"
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02"
          >
            {t("position", { current: index + 1, total: count })}
          </p>
          <p className="mt-1 font-mono text-caption text-black02/50">
            {t("dragHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
