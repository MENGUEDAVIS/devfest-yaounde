"use client";

import { useEffect, useRef, useState } from "react";

export interface StatCounterProps {
  value: number;
  label: string;
  /** e.g. "+" for "500+" */
  suffix?: string;
  /** Macro tier per DESIGN.md §6.2 (600ms-1.2s) — default 1200ms. */
  durationMs?: number;
  className?: string;
}

/**
 * DESIGN.md §6.2 macro-tier count-up, triggered when scrolled into view.
 * Respects prefers-reduced-motion by jumping straight to the final number
 * instead of counting — DESIGN.md §6.5.
 */
export function StatCounter({
  value,
  label,
  suffix = "",
  durationMs = 1200,
  className = "",
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (reduceMotion) {
            setDisplayValue(value);
            observer.disconnect();
            return;
          }

          const start = performance.now();
          function tick(now: number) {
            const progress = Math.min((now - start) / durationMs, 1);
            const eased = 1 - (1 - progress) * (1 - progress); // ease-out
            setDisplayValue(Math.round(eased * value));
            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          }
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <div ref={ref} className={`text-center ${className}`}>
      <div className="font-sans text-display-l font-bold text-black02">
        {displayValue.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-body-m text-black02">{label}</div>
    </div>
  );
}
