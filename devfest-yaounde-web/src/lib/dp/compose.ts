/**
 * DP generator — canvas compositing.
 *
 * Runs entirely in the browser. The photo is read with `createImageBitmap`
 * from a local File and drawn to a canvas; it is never uploaded, so there is
 * no server copy, no EXIF to strip and no retention question to answer.
 * See docs/decisions/0015-dp-generator-client-side.md.
 *
 * NO IMAGE LIBRARY, AND NO SHADER RUNTIME. Every effect here — duotone,
 * halftone, mono, grain, vignette — is a pass over an ImageData buffer or a
 * few hundred `arc` calls, which 2D canvas does well and which run once per
 * frame on a region of at most 734px square. A WebGL pipeline would mean
 * shader sources, a program cache, context-loss handling and a second code
 * path for the export, to make something imperceptibly faster. If an effect
 * ever genuinely needs the GPU, that is the moment for an ADR, not before.
 *
 * The card's art is FLAT throughout (DESIGN.md §2.6): solid shapes, no fill
 * ramps. The vignette is the one place a smooth falloff exists, and it is
 * computed per pixel over the PHOTO rather than painted as a ramp fill —
 * a photographic treatment, not a UI surface.
 */
import {
  DEFAULT_FRAME_ID,
  DEFAULT_TAG_ID,
  findFrame,
  findTag,
  type DpDecoration,
  type DpFrame,
} from "./frames";

/** Square output, sized for a social avatar without being wasteful. */
export const DP_SIZE = 1080;
/** The "print it big" option — same art, four times the pixels. */
export const DP_SIZE_HIGH = 2160;

/**
 * The photo box, as a fraction of the card: the card loses a 0.09 margin on
 * each side and a 0.14 band for the nickname.
 *
 * EXPORTED because the crop control needs it to turn pointer travel into pan.
 * It used to be copied into the component, which worked but left two numbers
 * that had to agree; importing the one the compositor actually draws with
 * means they cannot drift.
 */
export const PHOTO_BOX_RATIO = 0.68;
const PHOTO_MARGIN_RATIO = 0.09;
/**
 * Where the type starts, as a fraction of the card. Decorations stay above
 * it; the badge, the nickname and the wordmark live below it.
 */
const TEXT_BAND_TOP = 0.8;

/** Reject files that are not really images, or are large enough to hurt. */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

export interface DpTransform {
  /** 1 = photo fits the frame. Higher zooms in. */
  scale: number;
  /** Pan, in fractions of the frame size, from the centre. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_TRANSFORM: DpTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * The photo treatments. One look at a time, because they are alternatives
 * rather than layers — a mono duotone is just a duotone.
 */
export type DpLook = "none" | "duotone" | "halftone" | "mono";

export interface DpEffects {
  look: DpLook;
  /** Film grain. Independent of the look, and reads well over all of them. */
  grain: boolean;
  /** Darkened corners, computed per pixel. */
  vignette: boolean;
}

export const DEFAULT_EFFECTS: DpEffects = {
  look: "none",
  grain: false,
  vignette: false,
};

export interface DpComposeInput {
  photo: ImageBitmap;
  frameId?: string;
  /** Free-form display name — no real-name requirement (PAGES.md §9). */
  nickname: string;
  transform?: DpTransform;
  size?: number;
  effects?: DpEffects;
  tagId?: string;
  /** Which language the tag prints in. */
  locale?: "fr" | "en";
}

export class DpImageError extends Error {
  constructor(readonly code: "unsupported_type" | "too_large" | "unreadable") {
    super(code);
    this.name = "DpImageError";
  }
}

/**
 * Turns a picked File into a bitmap, validating first.
 *
 * The validation is a UX guard, not a security control — nothing leaves the
 * device, so a malformed file can only spoil the user's own render.
 */
export async function loadPhoto(file: File): Promise<ImageBitmap> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    throw new DpImageError("unsupported_type");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DpImageError("too_large");
  }
  try {
    return await createImageBitmap(file);
  } catch {
    throw new DpImageError("unreadable");
  }
}

/* ------------------------------------------------------------------ paths */

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

interface Box {
  x: number;
  y: number;
  size: number;
}

function maskPath(ctx: CanvasRenderingContext2D, frame: DpFrame, box: Box) {
  if (frame.mask === "circle") {
    ctx.beginPath();
    ctx.arc(
      box.x + box.size / 2,
      box.y + box.size / 2,
      box.size / 2,
      0,
      Math.PI * 2,
    );
    ctx.closePath();
  } else {
    roundedRectPath(ctx, box.x, box.y, box.size, box.size, box.size * 0.14);
  }
}

/* -------------------------------------------------------------- randomness */

/**
 * A tiny deterministic generator, seeded from the frame id.
 *
 * Confetti has to land in the same places every render: `Math.random` would
 * reshuffle the art on every pointer move during a drag, and the exported
 * file would not match the preview the person approved.
 */
function seeded(seed: string) {
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

/* ------------------------------------------------------------ decorations */

/**
 * True over the badge, the name and the wordmark.
 *
 * Only the CENTRED column, not the whole band: confetti in the bottom
 * corners is part of the look, confetti across someone's name is a defect.
 */
function overlapsType(x: number, y: number, size: number) {
  return y > size * TEXT_BAND_TOP && Math.abs(x - size / 2) < size * 0.42;
}

/** True where a decoration would land on the photo instead of around it. */
function overlapsPhoto(x: number, y: number, box: Box, pad: number) {
  return (
    x > box.x - pad &&
    x < box.x + box.size + pad &&
    y > box.y - pad &&
    y < box.y + box.size + pad
  );
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
  box: Box,
) {
  const rand = seeded(`${frame.id}-confetti`);
  const colours = frame.palette ?? [frame.accent];
  const pad = size * 0.02;
  let placed = 0;
  // Rejection sampling: keep drawing candidates, skip the ones that would sit
  // on the face. Capped so a hostile aspect ratio cannot spin here.
  for (let tries = 0; tries < 400 && placed < 34; tries++) {
    const x = rand() * size;
    const y = rand() * size;
    if (overlapsPhoto(x, y, box, pad) || overlapsType(x, y, size)) continue;
    placed++;

    const s = size * (0.014 + rand() * 0.018);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    ctx.fillStyle =
      colours[Math.floor(rand() * colours.length) % colours.length];
    const shape = Math.floor(rand() * 3);
    if (shape === 0) {
      roundedRectPath(ctx, -s / 2, -s / 4, s, s / 2, s * 0.2);
      ctx.fill();
    } else if (shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A chevron — the DevFest mark's own angle, at confetti scale.
      ctx.lineWidth = s * 0.28;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(-s / 2, -s / 2);
      ctx.lineTo(s / 2, 0);
      ctx.lineTo(-s / 2, s / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSparkles(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
  box: Box,
) {
  const rand = seeded(`${frame.id}-sparkle`);
  const colours = frame.palette ?? [frame.accent];
  let placed = 0;
  for (let tries = 0; tries < 200 && placed < 9; tries++) {
    const x = rand() * size;
    const y = rand() * size;
    if (overlapsPhoto(x, y, box, size * 0.015) || overlapsType(x, y, size))
      continue;
    placed++;
    const r = size * (0.012 + rand() * 0.014);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    ctx.fillStyle =
      colours[Math.floor(rand() * colours.length) % colours.length];
    // Four-point star: two opposing cusps on each axis, waisted at the centre.
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();
    ctx.restore();
  }
}

function drawBrackets(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
) {
  const arm = size * 0.075;
  const inset = size * 0.028;
  ctx.save();
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = size * 0.019;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Top-left "<" and bottom-right ">" — the mark's angle, blown up and used
  // as a frame rather than as a logo.
  ctx.beginPath();
  ctx.moveTo(inset + arm, inset);
  ctx.lineTo(inset, inset + arm);
  ctx.lineTo(inset + arm, inset + arm * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size - inset - arm, size - inset - arm * 2);
  ctx.lineTo(size - inset, size - inset - arm);
  ctx.lineTo(size - inset - arm, size - inset);
  ctx.stroke();
  ctx.restore();
}

function drawHalftoneField(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
  box: Box,
) {
  // Dots thin out from the bottom-left corner: the §2.4 halftone, used as a
  // texture on the card rather than on the photo.
  const step = size * 0.032;
  const maxR = step * 0.34;
  ctx.save();
  ctx.fillStyle = frame.palette?.[0] ?? frame.accent;
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      if (overlapsPhoto(x, y, box, size * 0.012)) continue;
      // Keep out of the band the badge, the name and the wordmark occupy —
      // a dot field behind a name is texture at the cost of reading it.
      if (y > size * TEXT_BAND_TOP) continue;
      const d = Math.hypot(x, size - y) / (size * 1.15);
      const r = maxR * Math.max(0, 1 - d);
      if (r < maxR * 0.12) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStripes(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
) {
  /* A diagonal band across the top-right corner. It is allowed to run under
     the photo rather than being kept clear of it: this is a `beneath` layer,
     so the photo lands on top and the band reads as passing behind — which
     is the point of putting it there. */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(size * 0.55, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(size, size * 0.45);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = frame.palette?.[1] ?? frame.accent;
  ctx.lineWidth = size * 0.016;
  const gap = size * 0.045;
  for (let i = -1; i < 14; i++) {
    const o = size * 0.5 + i * gap;
    ctx.beginPath();
    ctx.moveTo(o, 0);
    ctx.lineTo(o + size * 0.5, size * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTape(ctx: CanvasRenderingContext2D, frame: DpFrame, box: Box) {
  const w = box.size * 0.3;
  const h = box.size * 0.1;
  const corners: [number, number, number][] = [
    [box.x, box.y, -0.72],
    [box.x + box.size, box.y + box.size, -0.72],
  ];
  // ONE colour for both strips: tape comes off one roll, and two colours read
  // as two unrelated bars rather than as tape holding a photo down.
  const tapeColour = frame.palette?.[0] ?? frame.accent;
  corners.forEach(([cx, cy, rot]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = tapeColour;
    ctx.strokeStyle = frame.foreground;
    ctx.lineWidth = box.size * 0.008;
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, h * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawDashRing(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
  box: Box,
) {
  const grow = size * 0.028;
  ctx.save();
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = size * 0.008;
  ctx.setLineDash([size * 0.022, size * 0.018]);
  ctx.lineCap = "round";
  maskPath(ctx, frame, {
    x: box.x - grow,
    y: box.y - grow,
    size: box.size + grow * 2,
  });
  ctx.stroke();
  ctx.restore();
}

function drawPostcard(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
) {
  const inset = size * 0.032;
  ctx.save();
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = size * 0.012;
  roundedRectPath(
    ctx,
    inset,
    inset,
    size - inset * 2,
    size - inset * 2,
    size * 0.05,
  );
  ctx.stroke();
  ctx.restore();
}

/** Decorations that belong UNDER the photo. */
const BENEATH: DpDecoration[] = [
  "confetti",
  "brackets",
  "halftone",
  "sparkles",
  "stripes",
  "postcard",
];

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  frame: DpFrame,
  size: number,
  box: Box,
  layer: "beneath" | "over",
) {
  for (const decoration of frame.decorations) {
    const beneath = BENEATH.includes(decoration);
    if ((layer === "beneath") !== beneath) continue;
    switch (decoration) {
      case "confetti":
        drawConfetti(ctx, frame, size, box);
        break;
      case "sparkles":
        drawSparkles(ctx, frame, size, box);
        break;
      case "brackets":
        drawBrackets(ctx, frame, size);
        break;
      case "halftone":
        drawHalftoneField(ctx, frame, size, box);
        break;
      case "stripes":
        drawStripes(ctx, frame, size);
        break;
      case "postcard":
        drawPostcard(ctx, frame, size);
        break;
      case "tape":
        drawTape(ctx, frame, box);
        break;
      case "dashRing":
        drawDashRing(ctx, frame, size, box);
        break;
    }
  }
}

/* ----------------------------------------------------------------- effects */

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const n = parseInt(
    v.length === 3
      ? v
          .split("")
          .map((c) => c + c)
          .join("")
      : v,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Rec. 709 luma — the weighting that matches how bright a colour looks. */
const luma = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

function makeCanvas(size: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D;
} {
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(size, size)
      : Object.assign(document.createElement("canvas"), {
          width: size,
          height: size,
        });
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("2d canvas context unavailable");
  return { canvas, ctx };
}

/**
 * Draws the photo to COVER the box — the short edge fills, the long edge
 * overflows and is clipped. Scale and pan ride on top of that baseline, so
 * "scale 1, no offset" always produces a sensibly framed portrait.
 */
function drawCovered(
  ctx: CanvasRenderingContext2D,
  photo: ImageBitmap,
  size: number,
  transform: DpTransform,
) {
  const cover = Math.max(size / photo.width, size / photo.height);
  const scale = cover * Math.max(transform.scale, 0.1);
  const drawWidth = photo.width * scale;
  const drawHeight = photo.height * scale;
  const centreX = size / 2 + transform.offsetX * size;
  const centreY = size / 2 + transform.offsetY * size;
  ctx.drawImage(
    photo,
    centreX - drawWidth / 2,
    centreY - drawHeight / 2,
    drawWidth,
    drawHeight,
  );
}

/** Turns the photo into halftone dots, drawn in the frame's own two colours. */
function halftone(
  source: CanvasRenderingContext2D,
  size: number,
  dark: string,
  light: string,
) {
  const data = source.getImageData(0, 0, size, size).data;
  const cell = Math.max(4, Math.round(size / 58));
  source.fillStyle = light;
  source.fillRect(0, 0, size, size);
  source.fillStyle = dark;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      // One sample from the centre of the cell is enough at this dot pitch,
      // and avoids averaging cell² pixels on every pointer move.
      const sx = Math.min(size - 1, x + (cell >> 1));
      const sy = Math.min(size - 1, y + (cell >> 1));
      const i = (sy * size + sx) * 4;
      const t = luma(data[i], data[i + 1], data[i + 2]) / 255;
      const r = (cell / 2) * Math.sqrt(1 - t) * 1.22;
      if (r < 0.35) continue;
      source.beginPath();
      source.arc(x + cell / 2, y + cell / 2, r, 0, Math.PI * 2);
      source.fill();
    }
  }
}

/**
 * One pass over the pixels for the look, the grain and the vignette.
 *
 * Combined deliberately: three separate passes over a 734px square would read
 * the same buffer three times for no benefit.
 */
function applyPixelEffects(
  ctx: CanvasRenderingContext2D,
  size: number,
  effects: DpEffects,
  frame: DpFrame,
) {
  const needsPixels =
    effects.look === "duotone" ||
    effects.look === "mono" ||
    effects.grain ||
    effects.vignette;
  if (!needsPixels) return;

  const image = ctx.getImageData(0, 0, size, size);
  const px = image.data;
  const [dr, dg, db] = hexToRgb(frame.duotone?.[0] ?? "#1E1E1E");
  const [lr, lg, lb] = hexToRgb(frame.duotone?.[1] ?? frame.accent);
  const rand = seeded(`${frame.id}-grain`);
  const half = size / 2;
  // Corners start darkening at 62% of the way out, reaching 45% at the very
  // corner. Computed per pixel over the photo — a photographic falloff, not
  // a painted ramp on a UI surface (DESIGN.md §2.6).
  const vigStart = 0.62;
  const vigDepth = 0.55;

  for (let i = 0; i < px.length; i += 4) {
    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];

    if (effects.look === "mono") {
      const y = luma(r, g, b);
      r = g = b = y;
    } else if (effects.look === "duotone") {
      const t = luma(r, g, b) / 255;
      r = dr + (lr - dr) * t;
      g = dg + (lg - dg) * t;
      b = db + (lb - db) * t;
    }

    if (effects.grain) {
      const n = (rand() - 0.5) * 46;
      r += n;
      g += n;
      b += n;
    }

    if (effects.vignette) {
      const p = i >> 2;
      const dx = (p % size) - half;
      const dy = ((p / size) | 0) - half;
      const d = Math.hypot(dx, dy) / (half * Math.SQRT2);
      if (d > vigStart) {
        const k = 1 - ((d - vigStart) / (1 - vigStart)) * vigDepth;
        r *= k;
        g *= k;
        b *= k;
      }
    }

    px[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    px[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    px[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(image, 0, 0);
}

/** The photo, cropped and treated, on its own transparent layer. */
function renderPhotoLayer(
  photo: ImageBitmap,
  boxSize: number,
  transform: DpTransform,
  effects: DpEffects,
  frame: DpFrame,
) {
  const { canvas, ctx } = makeCanvas(Math.round(boxSize));
  const size = Math.round(boxSize);
  ctx.imageSmoothingQuality = "high";
  drawCovered(ctx, photo, size, transform);

  if (effects.look === "halftone") {
    halftone(
      ctx,
      size,
      frame.duotone?.[0] ?? "#1E1E1E",
      frame.duotone?.[1] ?? frame.background,
    );
  }
  applyPixelEffects(ctx, size, effects, frame);
  return canvas;
}

/* ------------------------------------------------------------------ render */

/**
 * Renders the whole card onto a canvas. Exposed separately from `composeDp`
 * so a live preview can draw into an on-screen canvas at a smaller size
 * without producing a Blob on every pointer move.
 */
export function renderDp(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  input: DpComposeInput,
): void {
  const size = input.size ?? DP_SIZE;
  const frame = findFrame(input.frameId ?? DEFAULT_FRAME_ID);
  if (!frame) throw new Error(`unknown frame: ${input.frameId}`);

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("2d canvas context unavailable");

  const transform = input.transform ?? DEFAULT_TRANSFORM;
  const effects = input.effects ?? DEFAULT_EFFECTS;
  const locale = input.locale ?? "fr";

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, size, size);

  const margin = size * PHOTO_MARGIN_RATIO;
  const box: Box = { x: margin, y: margin, size: size * PHOTO_BOX_RATIO };

  drawDecorations(ctx, frame, size, box, "beneath");

  ctx.save();
  maskPath(ctx, frame, box);
  ctx.clip();
  ctx.drawImage(
    renderPhotoLayer(input.photo, box.size, transform, effects, frame),
    box.x,
    box.y,
    box.size,
    box.size,
  );
  ctx.restore();

  // Accent ring, on the same path so it hugs whichever mask is active.
  ctx.save();
  maskPath(ctx, frame, box);
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = size * 0.018;
  ctx.stroke();
  ctx.restore();

  drawDecorations(ctx, frame, size, box, "over");

  // Role sticker, straddling the bottom edge of the photo.
  const tag = findTag(input.tagId ?? DEFAULT_TAG_ID);
  const tagText = tag?.text[locale] ?? "";
  if (tagText) {
    ctx.save();
    ctx.translate(size / 2, box.y + box.size);
    ctx.rotate(-0.045);
    ctx.font = `700 ${Math.round(size * 0.032)}px "Google Sans Code", "Google Sans", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const padX = size * 0.032;
    const w = ctx.measureText(tagText).width + padX * 2;
    const h = size * 0.072;
    ctx.fillStyle = frame.accent;
    ctx.strokeStyle = frame.foreground;
    ctx.lineWidth = size * 0.007;
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    // Ink on the accent, unless the accent IS the ink.
    ctx.fillStyle = frame.accent === "#1E1E1E" ? "#F0F0F0" : "#1E1E1E";
    ctx.fillText(tagText, 0, size * 0.002);
    ctx.restore();
  }

  // Nickname.
  const nickname = input.nickname.trim().slice(0, 28);
  if (nickname) {
    ctx.fillStyle = frame.foreground;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(size * 0.062)}px "Google Sans", "Product Sans", Inter, system-ui, sans-serif`;
    /* A badge takes the space directly under the photo, so the name moves
       down to clear it. Measured at 1080: 9px of gap before, 33px after. */
    ctx.fillText(
      nickname,
      size / 2,
      box.y + box.size + size * (tagText ? 0.098 : 0.075),
      size * 0.86,
    );
  }

  // Wordmark.
  ctx.fillStyle = frame.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${Math.round(size * 0.03)}px "Google Sans Mono", ui-monospace, monospace`;
  ctx.fillText("DEVFEST YAOUNDE", size / 2, size - size * 0.038, size * 0.86);
}

/**
 * Renders and hands back a PNG Blob, ready for a download link.
 *
 * Waits for fonts first. Canvas bakes whatever face was loaded at draw time
 * and never reflows, so composing before the webfont resolves exports a card
 * set in the fallback — the one place where the file would not match the
 * preview the person just approved.
 */
export async function composeDp(input: DpComposeInput): Promise<Blob> {
  const size = input.size ?? DP_SIZE;
  try {
    await document.fonts?.ready;
  } catch {
    // A browser without the Font Loading API still renders, just in whatever
    // it has. Not a reason to refuse the download.
  }

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(size, size);
    renderDp(canvas, input);
    return canvas.convertToBlob({ type: "image/png" });
  }

  const canvas = document.createElement("canvas");
  renderDp(canvas, input);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("canvas produced no blob")),
      "image/png",
    );
  });
}

/** Filename for the download. Kept ASCII-safe for awkward mobile browsers. */
export function dpFileName(nickname: string): string {
  const slug =
    nickname
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 32) || "devfest";
  return `devfest-yaounde-${slug}.png`;
}
