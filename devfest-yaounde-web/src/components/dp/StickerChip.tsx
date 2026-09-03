"use client";

import { useEffect, useRef } from "react";
import { drawStickerPreview } from "@/lib/dp/compose";

/**
 * One sticker in the picker, drawn by the compositor itself.
 *
 * Showing the ACTUAL artwork rather than a label is the difference between
 * choosing a sticker and reading a list of nouns — and because it goes
 * through the same routine as the card, a chip cannot advertise something the
 * card will not draw.
 */
export function StickerChip({
  stickerId,
  label,
  locale,
  onAdd,
}: {
  stickerId: string;
  label: string;
  locale: "fr" | "en";
  onAdd: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawStickerPreview(canvas, stickerId, locale, 96);
    draw();
    document.fonts?.ready.then(draw);
  }, [stickerId, locale]);

  return (
    <button
      type="button"
      onClick={onAdd}
      title={label}
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-black02 bg-offwhite transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-pastel active:translate-y-0.5 motion-reduce:transform-none"
    >
      <canvas ref={ref} className="h-10 w-10" aria-hidden />
    </button>
  );
}
