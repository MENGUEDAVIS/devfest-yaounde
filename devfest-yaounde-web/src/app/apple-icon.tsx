import { ImageResponse } from "next/og";
import { MARK_PATHS, MARK_VIEWBOX } from "@/lib/brand/devfest-mark";

/**
 * The home-screen icon iOS uses when someone saves the site.
 *
 * Generated rather than checked in as a PNG, for the same reason the social
 * card is: it is the mark on the brand's yellow, and if either changes there
 * is one place to change it. Apple ignores SVG touch icons, so `icon.svg`
 * cannot cover this case.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9AB00",
        fontSize: 96,
        fontWeight: 700,
        color: "#1E1E1E",
        fontFamily: "sans-serif",
      }}
    >
      {/* The real mark, from the same path data the site and the DP cards
          use — not a lookalike drawn twice. */}
      <svg
        width="132"
        viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}
        fill="none"
      >
        {MARK_PATHS.map(({ d, fill }) => (
          <path
            key={fill}
            d={d}
            fill={fill}
            stroke="#1E1E1E"
            strokeWidth="1.7918"
          />
        ))}
      </svg>
    </div>,
    size,
  );
}
