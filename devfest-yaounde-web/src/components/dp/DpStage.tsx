"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { renderDp, type DpTransform } from "@/lib/dp/compose";
import { clampTransform } from "./pan";

/**
 * Resolution the PREVIEW is drawn at — not the download, which is always
 * DP_SIZE. 720 is sharp on a 2x display at the size this box actually
 * occupies, and cheap enough to redraw on every pointer move.
 */
const PREVIEW_SIZE = 720;

/**
 * The photo box as a fraction of the card, mirroring `renderDp`: the card
 * loses a 0.09 margin on each side and a 0.14 band for the nickname.
 *
 * This is the ONE number shared with the compositor, and it is worth knowing
 * what it can and cannot break. It converts pointer travel into pan, so if it
 * ever drifts the drag feels slightly fast or slightly slow. It cannot
 * produce a wrong render, and it cannot let the photo be dragged off the
 * mask — `clampTransform` derives that from the aspect ratio alone.
 */
const PHOTO_BOX_RATIO = 0.68;

/** Arrow-key pan, as a fraction of the photo box. Shift makes it finer. */
const KEY_PAN_STEP = 0.02;
const KEY_ZOOM_STEP = 0.08;

export interface DpStageProps {
  photo: ImageBitmap;
  frameId: string;
  nickname: string;
  transform: DpTransform;
  onTransformChange: (next: DpTransform) => void;
  /** Describes the render for screen readers — the canvas has no text. */
  label: string;
  /** Id of the visible drag/keys hint, wired up as the description. */
  hintId: string;
}

/**
 * The live preview, and the crop control at the same time.
 *
 * There is no separate "cropper" and "preview" — the thing you drag IS the
 * card you are about to download, at the same proportions, with the nickname
 * and wordmark already on it. A crop box that shows a bare photo and then
 * hands back a differently-composed card makes people re-do the framing after
 * they see the result.
 *
 * Drag is Pointer Events, so mouse, touch and pen are one code path. Pointer
 * capture is taken on the way down: without it, dragging quickly enough to
 * leave the canvas drops the gesture halfway.
 *
 * `touch-action: none` is set here and nowhere else. It is what stops a
 * finger drag from scrolling the page instead of moving the photo, and it is
 * scoped to the canvas so the rest of the screen scrolls normally.
 */
export function DpStage({
  photo,
  frameId,
  nickname,
  transform,
  onTransformChange,
  label,
  hintId,
}: DpStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    from: DpTransform;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      renderDp(canvas, {
        photo,
        frameId,
        nickname,
        transform,
        size: PREVIEW_SIZE,
      });
    };

    draw();
    /* Canvas text does not re-flow when a webfont arrives the way DOM text
       does — whatever was loaded at draw time is baked into the pixels. One
       redraw once fonts are ready keeps the preview from being the only place
       on the page still showing the fallback face. */
    document.fonts?.ready.then(draw);

    return () => {
      cancelled = true;
    };
  }, [photo, frameId, nickname, transform]);

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    drag.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      from: transform,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== e.pointerId) return;

    /* Pan is measured against the DISPLAYED box, not the render resolution,
       so a photo tracks the finger 1:1 at any screen size. */
    const box = e.currentTarget.getBoundingClientRect().width * PHOTO_BOX_RATIO;
    if (box <= 0) return;

    onTransformChange(
      clampTransform(photo, {
        scale: active.from.scale,
        offsetX: active.from.offsetX + (e.clientX - active.x) / box,
        offsetY: active.from.offsetY + (e.clientY - active.y) / box,
      }),
    );
  };

  const endDrag = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /* Dragging is the only way to frame a photo with a mouse, which would leave
     the crop unreachable from a keyboard. Arrows pan, +/- zoom, Shift halves
     the step for fine work. */
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? KEY_PAN_STEP / 4 : KEY_PAN_STEP;
    let next: DpTransform | null = null;

    switch (e.key) {
      case "ArrowLeft":
        next = { ...transform, offsetX: transform.offsetX + step };
        break;
      case "ArrowRight":
        next = { ...transform, offsetX: transform.offsetX - step };
        break;
      case "ArrowUp":
        next = { ...transform, offsetY: transform.offsetY + step };
        break;
      case "ArrowDown":
        next = { ...transform, offsetY: transform.offsetY - step };
        break;
      case "+":
      case "=":
        next = { ...transform, scale: transform.scale + KEY_ZOOM_STEP };
        break;
      case "-":
      case "_":
        next = { ...transform, scale: transform.scale - KEY_ZOOM_STEP };
        break;
      default:
        return;
    }

    e.preventDefault();
    onTransformChange(clampTransform(photo, next));
  };

  return (
    <canvas
      ref={canvasRef}
      /* Square in CSS as well as in pixels: the element is sized by its
         container's width and the aspect ratio, never by the render size. */
      className="aspect-square w-full touch-none rounded-lg border-2 border-black02"
      role="img"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      /* Tells the custom cursor this is grabbable — the ring opens over it
         exactly as it does over any other control (CustomCursor.tsx). */
      data-cursor="grab"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    />
  );
}
