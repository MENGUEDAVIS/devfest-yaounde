import { MARK_PATHS, MARK_VIEWBOX } from "./devfest-mark";

/**
 * The mark on the brand's yellow, at whatever square size a manifest icon
 * or a touch icon needs — the exact same shape `apple-icon.tsx` already
 * draws, factored out so a 192px and a 512px PWA icon (PHASE22 §F) don't
 * each carry their own copy of it.
 */
export function appIconJsx(edge: number) {
  const markWidth = Math.round(edge * (132 / 180));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9AB00",
      }}
    >
      <svg
        width={markWidth}
        viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}
        fill="none"
      >
        {MARK_PATHS.map(({ d, fill }) => (
          <path
            key={fill}
            d={d}
            fill={fill}
            stroke="#1E1E1E"
            strokeWidth={edge / 100}
          />
        ))}
      </svg>
    </div>
  );
}
