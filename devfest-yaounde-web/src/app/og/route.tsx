import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

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
 */
export const runtime = "nodejs";

const YELLOW = "#F9AB00";
const INK = "#1E1E1E";
const PAPER = "#F0F0F0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Clamped: a long description pasted in would otherwise overflow the card.
  const title = (searchParams.get("title") ?? "DevFest Yaoundé").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") ?? "").slice(0, 130);

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
      }}
    >
      {/* The bracket motif, as two flat strokes rather than an image. */}
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
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          DEVFEST YAOUNDÉ
        </div>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
