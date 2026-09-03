"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * A ticket's badge code, as a scannable QR **and** as readable text.
 *
 * Both, always. The QR is the fast path at the door; the text is what gets
 * someone in when the screen is cracked, the battery is dead, or the scanner
 * will not focus. `docs/guides/frontend-integration.md` asks for both for
 * exactly that reason, and ADR 0020 records the decision.
 *
 * Rendering happens in the browser, into a canvas. The badge code is the
 * credential that admits someone, so it is never sent anywhere to be turned
 * into a picture.
 */
export function BadgeCode({
  code,
  label,
  size = 168,
}: {
  code: string;
  label: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    QRCode.toCanvas(canvas, code, {
      width: size,
      margin: 1,
      // Fixed black-on-white, deliberately NOT themed: scanners want maximum
      // contrast, and a themed QR would fail on the one screen where failing
      // means standing at the door.
      color: { dark: "#1e1e1e", light: "#ffffff" },
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [code, size]);

  return (
    <div className="flex flex-wrap items-center gap-5">
      {/* aria-hidden: the code beside it already carries the information, and
          "canvas" announced as an image would just be noise. */}
      {!failed && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="shrink-0 rounded-sm border-2 border-black02 bg-white"
        />
      )}
      <div className="min-w-0">
        <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
          {label}
        </p>
        <p className="mt-1 select-all break-all font-mono text-heading-m font-bold tracking-wide text-black02">
          {code}
        </p>
      </div>
    </div>
  );
}
