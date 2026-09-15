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
  /**
   * Position among the section's figures — the only thing the alternating
   * tilt (both the cursor card and the inline fallback) is derived from, so
   * a row of them reads as a loose stack of prints rather than everything
   * leaning the same identical way.
   */
  index: number;
  className?: string;
}

/** Alternates by position — see the `index` doc above. */
function tiltFor(index: number): number {
  return index % 2 === 0 ? -5 : 5;
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
 * exact ink — carrying `data-cursor-image` (and `data-cursor-tilt`, the
 * alternating lean `CustomCursor` reads onto the card — see `tiltFor`
 * above). `CustomCursor` turns into the picture inside it. The zone's
 * negative margin cancels its padding, so the layout is identical with or
 * without an image.
 *
 * The card and the inline fallback below are both sized closer to 3:2 than
 * the box used to be — the actual complaint was images reading as CROPPED,
 * and `object-cover` on a boxier frame was cutting the sides off a genuine
 * landscape photo. Widening the frame toward a real landscape ratio (rather
 * than switching to `object-contain`, which would leave dead space inside
 * the card — this design system doesn't do letterboxing) means cover has
 * far less to trim.
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
  index,
  className = "",
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = tiltFor(index);
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
  /*
    Bigger than `text-display-hero`'s own floor and preferred fraction, NOT a
    new entry in the shared `@theme` type scale — this file's own header
    warns against font sizes that aren't in DESIGN.md, and this size is
    scoped to one component rather than a named step anyone else should
    reach for. Same curve shape, raised: 56px floor (was 44px, the complaint
    on a phone) up to the SAME 120px ceiling `text-display-hero` has, so a
    figure still never outweighs the actual hero it sits below.
  */
  const numberSize = "text-[clamp(3.5rem,9vw,7.5rem)]";
  const number = (
    <>
      <Odometer
        value={shown}
        digits={digits}
        live={false}
        srText={`${value.toLocaleString(locale)}${suffix}`}
        className={`font-sans ${numberSize} font-bold text-black02`}
        revolutions={1}
        durationMs={1100}
        staggerMs={90}
      />
      {suffix && (
        <span
          aria-hidden
          className={`font-sans ${numberSize} font-bold leading-none text-black02`}
        >
          {suffix}
        </span>
      )}
    </>
  );

  return (
    <div ref={ref} className={className}>
      {imageUrl && (
        // Inline fallback — decorative, the label says what it is. Sized
        // and rotated the same way the cursor card is (see the doc comment
        // above): bigger than before, closer to 3:2 so a landscape photo
        // isn't cropped down to a near-square.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{ transform: `rotate(${tilt}deg)` }}
          className="stat-inline-image mb-5 h-24 w-36 rounded-md border-2 border-black02 object-cover"
        />
      )}

      {/* §7b: a big number IS the section's star element — size it like one */}
      {imageUrl ? (
        <span
          data-cursor-image={imageUrl}
          data-cursor-tilt={tilt}
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
