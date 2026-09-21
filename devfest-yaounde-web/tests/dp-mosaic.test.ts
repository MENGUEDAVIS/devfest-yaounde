import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mosaicPhoto } from "@/lib/dp/compose";

/**
 * A minimal in-memory 2D context — enough for `mosaicPhoto`, which only reads
 * the box once and then paints rectangles. Node has no canvas, and pulling in
 * a canvas package to test one pass would be a new dependency for nothing.
 * fillRect here snaps to whole pixels; the real canvas anti-aliases a
 * fractional edge, which only ever softens a seam, never moves it.
 */
type Rgb = [number, number, number];

function harness(w: number, h: number, picture: (u: number, v: number) => Rgb) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = picture((x + 0.5) / w, (y + 0.5) / h);
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  let style = "#000";
  const ctx = {
    getImageData: () => ({ data: new Uint8ClampedArray(px) }),
    get fillStyle() {
      return style;
    },
    set fillStyle(v: string) {
      style = v;
    },
    fillRect(x: number, y: number, rw: number, rh: number) {
      let colour: Rgb;
      const rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(style);
      if (rgb) colour = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
      else {
        const n = parseInt(style.slice(1), 16);
        colour = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      const x0 = Math.max(0, Math.round(x));
      const y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(w, Math.round(x + rw));
      const y1 = Math.min(h, Math.round(y + rh));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * w + xx) * 4;
          px[i] = colour[0];
          px[i + 1] = colour[1];
          px[i + 2] = colour[2];
        }
      }
    },
  } as unknown as CanvasRenderingContext2D;
  const at = (x: number, y: number): Rgb => {
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  return { ctx, px, at };
}

const GROUT: Rgb = [0x1e, 0x1e, 0x1e];
const isGrout = (c: Rgb) => c[0] === 0x1e && c[1] === 0x1e && c[2] === 0x1e;

describe("the mosaic look", () => {
  const flat = (): Rgb => [200, 120, 60];

  it("is deterministic: the same photo lays the same tiles every time", () => {
    const a = harness(340, 340, (u, v) => [u * 255, v * 255, 90]);
    const b = harness(340, 340, (u, v) => [u * 255, v * 255, 90]);
    mosaicPhoto(a.ctx, 340, 340, "google");
    mosaicPhoto(b.ctx, 340, 340, "google");
    assert.deepEqual(a.px, b.px);
  });

  it("varies with the style's seed, so two styles don't share a tile pattern", () => {
    const a = harness(340, 340, flat);
    const b = harness(340, 340, flat);
    mosaicPhoto(a.ctx, 340, 340, "google");
    mosaicPhoto(b.ctx, 340, 340, "other");
    assert.notDeepEqual(a.px, b.px);
  });

  it("paints tiles close to the photo's colour with ink grout between them", () => {
    const { ctx, px } = harness(680, 680, flat);
    mosaicPhoto(ctx, 680, 680, "google");
    let grout = 0;
    let tile = 0;
    for (let i = 0; i < px.length; i += 4) {
      const c: Rgb = [px[i], px[i + 1], px[i + 2]];
      if (isGrout(c)) {
        grout++;
        continue;
      }
      tile++;
      // Nudged by at most the tonal jitter (plus rounding), never re-coloured.
      assert.ok(Math.abs(c[0] - 200) <= 10, `red ${c[0]}`);
      assert.ok(Math.abs(c[1] - 120) <= 10, `green ${c[1]}`);
      assert.ok(Math.abs(c[2] - 60) <= 10, `blue ${c[2]}`);
    }
    const share = grout / (grout + tile);
    assert.ok(share > 0.05 && share < 0.25, `grout share ${share}`);
  });

  it("never bleeds one tile's colour into the next", () => {
    // Left half red, right half blue, split exactly on a tile boundary
    // (34 columns -> boundary at column 17). No tile may be purple.
    const { ctx, at } = harness(680, 680, (u) =>
      u < 0.5 ? [220, 20, 20] : [20, 20, 220],
    );
    mosaicPhoto(ctx, 680, 680, "google");
    for (let y = 0; y < 680; y += 3) {
      for (let x = 0; x < 680; x += 3) {
        const c = at(x, y);
        if (isGrout(c)) continue;
        if (x < 340) assert.ok(c[0] > 150 && c[2] < 80, `x=${x} y=${y} ${c}`);
        else assert.ok(c[2] > 150 && c[0] < 80, `x=${x} y=${y} ${c}`);
      }
    }
  });

  it("is the same picture at any resolution — preview and export agree", () => {
    // The tile grid, the grout share and the jitter sequence are all
    // fractions of the render, so sampling each tile's centre at 340px and
    // at 1360px must agree to within rounding of a smooth photo.
    const picture = (u: number, v: number): Rgb => [
      40 + u * 170,
      60 + v * 150,
      120 + Math.sin(u * 6) * 40,
    ];
    const small = harness(340, 340, picture);
    const large = harness(1360, 1360, picture);
    mosaicPhoto(small.ctx, 340, 340, "google");
    mosaicPhoto(large.ctx, 1360, 1360, "google");
    const cols = 34;
    let worst = 0;
    for (let row = 0; row < cols; row++) {
      for (let col = 0; col < cols; col++) {
        const s = small.at(
          Math.floor(((col + 0.5) * 340) / cols),
          Math.floor(((row + 0.5) * 340) / cols),
        );
        const l = large.at(
          Math.floor(((col + 0.5) * 1360) / cols),
          Math.floor(((row + 0.5) * 1360) / cols),
        );
        assert.ok(!isGrout(s) && !isGrout(l), "tile centre is grout");
        worst = Math.max(worst, ...s.map((v, k) => Math.abs(v - l[k])));
      }
    }
    // A diverged jitter sequence would show as up to ~18 here.
    assert.ok(worst <= 6, `tile colours differ by ${worst} between sizes`);
  });

  it("survives a tiny box without throwing", () => {
    const { ctx } = harness(8, 6, flat);
    assert.doesNotThrow(() => mosaicPhoto(ctx, 8, 6, "google"));
    void GROUT;
  });
});
