import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SHAPE_STICKERS } from "@/lib/dp/stickers";

/**
 * The branded social card, rendered on demand.
 *
 * `/og?title=…&subtitle=…` — one route for every page, because the headline
 * is the only thing that differs and a dozen hand-made PNGs would drift from
 * the brand the first time a colour moved.
 *
 * FLAT FILLS ONLY, like everything else (DESIGN.md §2.6): solid Yellow
 * ground, an ink panel, the bracket motif. It is deliberately the DEFAULT
 * yellow rather than the visitor's chosen theme — the image is baked once and
 * cached by whoever unfurls the link, so it cannot follow a per-visitor
 * setting, and pretending otherwise would just make the cache lie.
 *
 * ## What this card has to say before anything else
 *
 * It used to carry the event name and nothing else — no mark, and no mention
 * of the chapter putting the event on. A link unfurled in a WhatsApp group
 * showed a yellow rectangle that could have been anyone's DevFest. So the
 * card now leads with **GDG Yaoundé × DevFest Yaoundé 2026** and the real
 * mark, and scatters a few of the generator's own stickers around the edges,
 * which is the same visual language people meet on the DP page.
 */
export const runtime = "nodejs";

const YELLOW = "#F9AB00";
const INK = "#1E1E1E";
const PAPER = "#F0F0F0";

/**
 * The mark, inlined.
 *
 * Read from `public/` and embedded rather than linked: the renderer has no
 * origin to resolve a relative path against, and pointing it at the live site
 * would make a social card depend on the site being up to describe the site.
 *
 * Cached across invocations on a warm function, and wrapped because a social
 * card is not worth a 500 — a missing mark degrades to the drawn bracket.
 */
let markPromise: Promise<string | null> | null = null;
function devfestMark(): Promise<string | null> {
  markPromise ??= readFile(join(process.cwd(), "public/logo/devfest-logo.svg"))
    .then((buffer) => `data:image/svg+xml;base64,${buffer.toString("base64")}`)
    .catch(() => null);
  return markPromise;
}

/**
 * A few stickers from the generator, placed by hand.
 *
 * Fixed ids and fixed positions rather than a random pick: this image is
 * cached by every service that unfurls the link, so "random" would only mean
 * "whichever one was rolled the first time anybody shared this page" — all
 * the unpredictability of a constant with none of the honesty.
 */
const SCATTER: {
  id: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  size: number;
  rotate: number;
}[] = [
  { id: "bolt", top: 132, right: 96, size: 96, rotate: 14 },
  { id: "spark", top: 300, right: 190, size: 68, rotate: -18 },
  { id: "code", bottom: 150, right: 108, size: 84, rotate: 9 },
  { id: "cup", top: 250, right: 60, size: 62, rotate: 24 },
];

function Sticker({ id, size }: { id: string; size: number }) {
  const sticker = SHAPE_STICKERS.find((entry) => entry.id === id);
  if (!sticker || sticker.mark || sticker.paths.length === 0) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {sticker.paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={path.fill ?? sticker.fill}
          stroke={INK}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Clamped: a long description pasted in would otherwise overflow the card.
  const title = (searchParams.get("title") ?? "DevFest Yaoundé").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") ?? "").slice(0, 130);
  const mark = await devfestMark();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: YELLOW,
        padding: 64,
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Stickers first, so every panel and every line sits over them. */}
      {SCATTER.map((item) => (
        <div
          key={item.id}
          style={{
            position: "absolute",
            display: "flex",
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            transform: `rotate(${item.rotate}deg)`,
            opacity: 0.9,
          }}
        >
          <Sticker id={item.id} size={item.size} />
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: INK,
            color: PAPER,
            padding: "14px 30px",
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {mark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} width={58} height={32} alt="" />
          ) : null}
          GDG YAOUNDÉ &nbsp;×&nbsp; DEVFEST YAOUNDÉ 2026
        </div>
        {/* The bracket motif, as two flat strokes rather than an image. */}
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRight: `16px solid ${INK}`,
            borderTop: `16px solid ${INK}`,
            borderTopRightRadius: 24,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          maxWidth: 860,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: title.length > 34 ? 76 : 104,
            lineHeight: 1.02,
            fontWeight: 700,
            color: INK,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.3,
              color: INK,
              opacity: 0.75,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            width: 88,
            height: 16,
            background: INK,
            borderRadius: 999,
          }}
        />
        <div style={{ display: "flex", fontSize: 28, color: INK }}>
          devfest.gdgyaounde.com
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
