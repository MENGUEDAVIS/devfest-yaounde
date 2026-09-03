/**
 * DP generator — background patterns.
 *
 * Eight routines, one signature. Each fills the whole card and reads its
 * colours from the style, so any style can use any pattern and a new
 * combination costs one line in `frames.ts`.
 *
 * Everything is FLAT (DESIGN.md §2.6). The craft comes from shape, weight and
 * repetition — there is not a single colour ramp in here, including in `rays`,
 * which is wedges of solid colour rather than a radial sweep.
 */
import type { DpFrame, DpPattern } from "./frames";

/**
 * A tiny deterministic generator, seeded from the style id.
 *
 * The pattern has to land in the same place on every render: `Math.random`
 * would reshuffle it on each pointer move during a drag, and the exported
 * file would not match the preview the person approved.
 */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

interface PatternArgs {
  ctx: CanvasRenderingContext2D;
  frame: DpFrame;
  /** Card size in pixels. */
  w: number;
  h: number;
  /** The unit every length is expressed in — the card's width. */
  u: number;
}

function colours(frame: DpFrame): string[] {
  return frame.palette?.length ? frame.palette : [frame.accent];
}

/* ------------------------------------------------------------------ shapes */

function chevron(ctx: CanvasRenderingContext2D, s: number) {
  ctx.lineWidth = s * 0.28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s / 2);
  ctx.lineTo(s / 2, 0);
  ctx.lineTo(-s / 2, s / 2);
  ctx.stroke();
}

function fourPointStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
}

/* ---------------------------------------------------------------- patterns */

function confetti({ ctx, frame, w, h, u }: PatternArgs) {
  const rand = seeded(`${frame.id}-confetti`);
  const palette = colours(frame);
  const count = Math.round(((w * h) / (u * u)) * 52);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const s = u * (0.016 + rand() * 0.024);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    const colour =
      palette[Math.floor(rand() * palette.length) % palette.length];
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    const shape = Math.floor(rand() * 4);
    if (shape === 0) {
      roundedRectPath(ctx, -s / 2, -s / 4, s, s / 2, s * 0.22);
      ctx.fill();
    } else if (shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 2) {
      chevron(ctx, s);
    } else {
      fourPointStar(ctx, s / 2);
    }
    ctx.restore();
  }
}

function terrazzo({ ctx, frame, w, h, u }: PatternArgs) {
  const rand = seeded(`${frame.id}-terrazzo`);
  const palette = colours(frame);
  const chips = Math.round(((w * h) / (u * u)) * 90);
  for (let i = 0; i < chips; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const s = u * (0.012 + rand() * 0.026);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    ctx.fillStyle =
      palette[Math.floor(rand() * palette.length) % palette.length];
    // Irregular quadrilaterals, the way real terrazzo chips break.
    ctx.beginPath();
    ctx.moveTo(-s * (0.4 + rand() * 0.3), -s * (0.3 + rand() * 0.3));
    ctx.lineTo(s * (0.3 + rand() * 0.4), -s * (0.4 + rand() * 0.2));
    ctx.lineTo(s * (0.4 + rand() * 0.2), s * (0.3 + rand() * 0.3));
    ctx.lineTo(-s * (0.3 + rand() * 0.3), s * (0.4 + rand() * 0.2));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Ink speckle, which is what stops it reading as scattered sweets.
  ctx.fillStyle = "#1E1E1E";
  for (let i = 0; i < chips * 2; i++) {
    ctx.beginPath();
    ctx.arc(
      rand() * w,
      rand() * h,
      u * (0.001 + rand() * 0.0035),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function halftone({ ctx, frame, w, h, u }: PatternArgs) {
  const step = u * 0.03;
  const maxR = step * 0.42;
  const palette = colours(frame);
  const diag = Math.hypot(w, h);
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      // Dots thin out from the bottom-left, so the card has a direction.
      const t = Math.hypot(x, h - y) / diag;
      const r = maxR * Math.max(0, 1 - t * 1.35);
      if (r < maxR * 0.1) continue;
      ctx.fillStyle =
        palette[(Math.round(x / step) + Math.round(y / step)) % palette.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function checker({ ctx, frame, w, h, u }: PatternArgs) {
  const cell = u * 0.115;
  const r = cell * 0.28;
  const palette = colours(frame);
  let row = 0;
  for (let y = -cell; y < h + cell; y += cell) {
    let col = 0;
    for (let x = -cell; x < w + cell; x += cell) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = palette[(row + col) % palette.length];
        // Rounded squares, offset a little each row so it is a pattern
        // rather than a spreadsheet.
        roundedRectPath(
          ctx,
          x + (row % 2 ? cell * 0.18 : 0),
          y,
          cell * 0.92,
          cell * 0.92,
          r,
        );
        ctx.fill();
      }
      col++;
    }
    row++;
  }
}

function waves({ ctx, frame, w, h, u }: PatternArgs) {
  const palette = colours(frame);
  const band = u * 0.085;
  ctx.lineCap = "round";
  let i = 0;
  for (let y = -band; y < h + band * 2; y += band) {
    ctx.strokeStyle = palette[i % palette.length];
    ctx.lineWidth = band * (0.3 + (i % 3) * 0.08);
    ctx.beginPath();
    const amp = band * 0.55;
    const wl = u * 0.34;
    ctx.moveTo(-band, y);
    for (let x = -band; x <= w + band; x += wl / 8) {
      ctx.lineTo(x, y + Math.sin((x / wl) * Math.PI * 2 + i * 0.7) * amp);
    }
    ctx.stroke();
    i++;
  }
}

function grid({ ctx, frame, w, h, u }: PatternArgs) {
  const minor = u * 0.045;
  const palette = colours(frame);
  ctx.strokeStyle = palette[0];
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.beginPath();
  for (let x = 0; x <= w; x += minor) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Heavier rules every fifth line, and ticks where they cross — the thing
  // that makes a grid read as drafting paper rather than as graph paper.
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1, u * 0.0045);
  ctx.beginPath();
  for (let x = 0; x <= w; x += minor * 5) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += minor * 5) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = palette[1] ?? palette[0];
  const tick = u * 0.008;
  for (let x = 0; x <= w; x += minor * 5) {
    for (let y = 0; y <= h; y += minor * 5) {
      ctx.fillRect(x - tick / 2, y - tick / 8, tick, tick / 4);
      ctx.fillRect(x - tick / 8, y - tick / 2, tick / 4, tick);
    }
  }
}

function rays({ ctx, frame, w, h, u }: PatternArgs) {
  const palette = colours(frame);
  const cx = w * 0.5;
  const cy = h * 1.02;
  const radius = Math.hypot(w, h) * 1.2;
  const wedges = 22;
  for (let i = 0; i < wedges; i++) {
    if (i % 2) continue;
    const a0 = Math.PI + (i / wedges) * Math.PI;
    const a1 = Math.PI + ((i + 1) / wedges) * Math.PI;
    ctx.fillStyle = palette[(i / 2) % palette.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  // A flat band across the base, so the wedges have something to sit on.
  ctx.fillStyle = palette[palette.length - 1];
  ctx.fillRect(0, h - u * 0.03, w, u * 0.03);
  void u;
}

function tiles({ ctx, frame, w, h, u }: PatternArgs) {
  const cell = u * 0.075;
  const palette = colours(frame);
  let row = 0;
  for (let y = -cell; y < h + cell; y += cell) {
    let col = 0;
    for (let x = -cell; x < w + cell; x += cell) {
      const c = (row * 3 + col * 5) % 7;
      if (c < 3) {
        ctx.fillStyle = palette[c % palette.length];
        const inset = cell * 0.12;
        roundedRectPath(
          ctx,
          x + inset,
          y + inset,
          cell - inset * 2,
          cell - inset * 2,
          // Quarter-round on alternating corners gives the tiling a weave.
          (row + col) % 2 ? cell * 0.42 : cell * 0.14,
        );
        ctx.fill();
      }
      col++;
    }
    row++;
  }
}

const PATTERNS = {
  confetti,
  terrazzo,
  halftone,
  checker,
  waves,
  grid,
  rays,
  tiles,
} as const;

export function drawPattern(args: PatternArgs) {
  const { ctx, frame } = args;
  ctx.save();
  PATTERNS[frame.pattern](args);
  ctx.restore();
}

/** Patterns made of loose pieces, which can believably fall in FRONT. */
const SCATTERED: DpPattern[] = ["confetti", "terrazzo"];

/**
 * A handful of pattern pieces drawn OVER the photo's corners.
 *
 * It is a small thing that does a lot: the photo stops being a rectangle
 * pasted on a background and starts being something the card is holding.
 * Only the scattered patterns get it — a checkerboard spilling over a
 * photograph would just look like a mistake.
 */
export function drawOverspill({
  ctx,
  frame,
  w,
  h,
  u,
  photo,
}: PatternArgs & { photo: { x: number; y: number; w: number; h: number } }) {
  if (!SCATTERED.includes(frame.pattern)) return;
  const rand = seeded(`${frame.id}-spill`);
  const palette = colours(frame);
  const corners = [
    [photo.x, photo.y],
    [photo.x + photo.w, photo.y],
    [photo.x, photo.y + photo.h],
    [photo.x + photo.w, photo.y + photo.h],
  ];
  ctx.save();
  for (const [cx, cy] of corners) {
    const pieces = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < pieces; i++) {
      const x = cx + (rand() - 0.5) * u * 0.16;
      const y = cy + (rand() - 0.5) * u * 0.16;
      const s = u * (0.02 + rand() * 0.026);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      const colour =
        palette[Math.floor(rand() * palette.length) % palette.length];
      ctx.fillStyle = colour;
      ctx.strokeStyle = colour;
      if (rand() > 0.5) {
        roundedRectPath(ctx, -s / 2, -s / 4, s, s / 2, s * 0.22);
        ctx.fill();
      } else {
        chevron(ctx, s);
      }
      ctx.restore();
    }
  }
  ctx.restore();
  void w;
  void h;
}
