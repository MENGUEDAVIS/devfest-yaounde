"use client";

import { useEffect, useRef } from "react";

/** Distance between dot centres, and the dot's own radius, in CSS pixels. */
const SPACING = 30;
const RADIUS = 3.4;
/** The whole field leans, so the grid never reads as a spreadsheet. */
const TILT_DEG = -11;
/** Resting opacity, and the opacity under the middle of the highlight. */
const BASE_ALPHA = 0.1;
const PEAK_ALPHA = 0.92;

/**
 * The dot field behind the preloader.
 *
 * THE DOTS NEVER CHANGE COLOUR. They are ink, always, and what animates is
 * their OPACITY: a soft highlight drifts around the field and the dots under
 * it come up. That is the whole effect — a spotlight wandering over a printed
 * halftone, not a colour cycle.
 *
 * Canvas rather than CSS: the pattern itself could be a repeating radial
 * gradient, but gradients are banned as design surfaces (DESIGN.md §2.6) and
 * a per-dot opacity falloff is not something a background-image can express
 * anyway. A few hundred `arc` calls a frame is nothing.
 *
 * The drift is a sum of sines rather than a random walk — it never repeats on
 * a human timescale, it never jumps, and it needs no state between frames.
 */
export function PreloaderDots({ calm }: { calm: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      /* Where the highlight is right now. Two sines per axis, at
         deliberately unrelated periods, so the path never closes into a
         visible loop. Under reduced motion it simply parks. */
      const s = calm ? 0 : t / 1000;
      const hx =
        width * (0.5 + 0.34 * Math.sin(s * 0.31) + 0.1 * Math.sin(s * 0.73));
      const hy =
        height * (0.5 + 0.3 * Math.cos(s * 0.24) + 0.11 * Math.sin(s * 0.61));
      const reach = Math.max(width, height) * 0.34;

      ctx.save();
      // Tilt the field about the middle, and over-draw past every edge so the
      // rotation never exposes a bare corner.
      ctx.translate(width / 2, height / 2);
      ctx.rotate((TILT_DEG * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      const bleed = Math.ceil(Math.max(width, height) * 0.25);
      ctx.fillStyle = "#1E1E1E";

      for (let y = -bleed; y < height + bleed; y += SPACING) {
        for (let x = -bleed; x < width + bleed; x += SPACING) {
          /* The highlight lives in SCREEN space, so it drifts across the
             tilted grid rather than with it — the field stays still and the
             light moves over it, which is the point. */
          const px = x - width / 2;
          const py = y - height / 2;
          const cos = Math.cos((-TILT_DEG * Math.PI) / 180);
          const sin = Math.sin((-TILT_DEG * Math.PI) / 180);
          const sx = px * cos - py * sin + width / 2;
          const sy = px * sin + py * cos + height / 2;

          const d = Math.hypot(sx - hx, sy - hy);
          const fall = Math.max(0, 1 - d / reach);
          ctx.globalAlpha =
            BASE_ALPHA + (PEAK_ALPHA - BASE_ALPHA) * fall * fall;

          ctx.beginPath();
          ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    resize();
    draw(0);

    if (calm) {
      // One frame, and nothing moves. Still branded, still legible.
      window.addEventListener("resize", () => {
        resize();
        draw(0);
      });
      return;
    }

    const loop = (t: number) => {
      draw(t);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [calm]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
