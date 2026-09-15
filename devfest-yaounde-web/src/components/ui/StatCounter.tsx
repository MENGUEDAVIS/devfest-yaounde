"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { Odometer } from "./Odometer";

export interface StatCounterProps {
  value: number;
  label: string;
  /** e.g. "+" for "500+" */
  suffix?: string;
  /** Picture for the figure — the cursor card on desktop, inline elsewhere. */
  imageUrl?: string;
  className?: string;
}

/**
 * One home page figure (PHASE21 §C).
 *
 * THE NUMBER rolls in with the shared `Odometer` — the remaining-tickets
 * counter's, not a second implementation. It paints 0 and switches to the
 * real value once 40% of it is on screen; each column makes one extra full
 * turn and they land left to right, the "view counter spinning up" read.
 * This replaced a requestAnimationFrame count-up.
 *
 * Reduced motion: the value is shown straight away (no observer wait) and the
 * odometer drops its transition, so it is simply there — the ticket counter's
 * convention.
 *
 * THE IMAGE. With one, the number is wrapped in a hover ZONE — padded out
 * past the glyphs so it is a comfortable, deliberate target rather than the
 * exact ink — carrying `data-cursor-image`. `CustomCursor` turns into the
 * picture inside it. The zone's negative margin cancels its padding, so the
 * layout is identical with or without an image.
 *
 * Where the cursor cannot do that (touch, reduced motion) the same image is
 * shown inline above the number instead: `.stat-inline-image` is hidden by
 * CSS under exactly the media query the cursor runs under, so it is decided
 * before hydration and one of the two is always present.
 *
 * Assistive tech gets the real figure from the first render — the rolling
 * digits are aria-hidden — so a screen reader never hears "0".
 */
export function StatCounter({
  value,
  label,
  suffix = "",
  imageUrl,
  className = "",
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer, no reason to wait — never leave a figure at 0.
      // Deferred a microtask: a synchronous setState in an effect body is
      // what `react-hooks/set-state-in-effect` refuses.
      queueMicrotask(() => setSeen(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const shown = seen || reduceMotion ? value : 0;
  const digits = String(Math.max(0, Math.round(value))).length;
  const number = (
    <>
      <Odometer
        value={shown}
        digits={digits}
        live={false}
        srText={`${value.toLocaleString(locale)}${suffix}`}
        className="font-sans text-display-hero font-bold text-black02"
        revolutions={1}
        durationMs={1100}
        staggerMs={90}
      />
      {suffix && (
        <span
          aria-hidden
          className="font-sans text-display-hero font-bold leading-none text-black02"
        >
          {suffix}
        </span>
      )}
    </>
  );

  return (
    <div ref={ref} className={className}>
      {imageUrl && (
        // Inline fallback — decorative, the label says what it is.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="stat-inline-image mb-5 h-20 w-28 -rotate-3 rounded-md border-2 border-black02 object-cover"
        />
      )}

      {/* §7b: a big number IS the section's star element — size it like one */}
      {imageUrl ? (
        <span
          data-cursor-image={imageUrl}
          className="-mx-6 -my-4 inline-flex items-end px-6 py-4"
        >
          {number}
        </span>
      ) : (
        <span className="inline-flex items-end">{number}</span>
      )}

      <div className="mt-4 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70">
        {label}
      </div>
    </div>
  );
}
