"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

export interface ChartSeries {
  label: string;
  values: number[];
  color: string;
  axis?: "y" | "y1";
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const n =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AdminChart({
  labels,
  series,
  caption,
}: {
  labels: string[];
  series: ChartSeries[];
  caption: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");
  const payload = JSON.stringify({ labels, series });
  /**
   * Whether the chart has ever been on screen.
   *
   * IT DID ANIMATE — nobody ever saw it. The chart sits well below the stat
   * tiles on Overview, so it mounted on page load, drew its 900ms entrance
   * to an empty room, and was already finished by the time anybody scrolled
   * down to it. The same mistake the hero made behind the preloader.
   *
   * So the chart is not CONSTRUCTED until it comes into view. Chart.js
   * animates from construction, which makes "when it is built" and "when the
   * animation plays" the same moment — no second animation system, and
   * nothing to keep in sync.
   *
   * One-way: once seen it stays built, so scrolling past does not replay the
   * entrance every time, which would be a fidget rather than an entrance.
   */
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = frame.current;
    if (!node || seen) return;

    // No IntersectionObserver — an old browser, or a test environment.
    // Draw it anyway: a chart that is there beats an entrance. On the next
    // tick rather than here, because a setState in an effect BODY is what
    // `react-hooks/set-state-in-effect` refuses, and rightly.
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setSeen(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      // A little early, so the entrance starts as the chart clears the fold
      // rather than after it has already stopped.
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);

  useEffect(() => {
    const node = canvas.current;
    if (!node || !seen) return;
    let chart: { destroy: () => void } | null = null;
    let cancelled = false;

    void import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled || !canvas.current) return;
      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;
      const styles = getComputedStyle(document.documentElement);
      const ink =
        styles.getPropertyValue("--color-black02").trim() || "#1e1e1e";
      const height = canvas.current.getBoundingClientRect().height || 420;
      const dual = series.some((s) => s.axis === "y1");

      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: series.map((s) => {
            const fill = ctx.createLinearGradient(0, 0, 0, height);
            fill.addColorStop(0, withAlpha(s.color, 0.28));
            fill.addColorStop(1, withAlpha(s.color, 0.02));
            return {
              label: s.label,
              data: s.values,
              borderColor: s.color,
              backgroundColor: fill,
              pointBackgroundColor: s.color,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 2,
              fill: true,
              tension: 0.35,
              yAxisID: s.axis === "y1" ? "y1" : "y",
            };
          }),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          animation: calm ? false : { duration: 900 },
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "start",
              labels: {
                color: ink,
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: true,
                pointStyle: "rectRounded",
                font: { family: "inherit", size: 12, weight: 700 },
              },
            },
            tooltip: { enabled: true },
          },
          scales: {
            x: {
              ticks: { color: ink, maxRotation: 0 },
              grid: { display: false },
              border: { color: withAlpha(ink, 0.2) },
            },
            y: {
              beginAtZero: true,
              ticks: { color: ink, precision: 0 },
              grid: { color: withAlpha(ink, 0.08) },
              border: { color: withAlpha(ink, 0.2) },
            },
            ...(dual
              ? {
                  y1: {
                    beginAtZero: true,
                    position: "right" as const,
                    ticks: { color: ink, precision: 0 },
                    grid: { drawOnChartArea: false },
                    border: { color: withAlpha(ink, 0.2) },
                  },
                }
              : {}),
          },
        },
      });
    });

    return () => {
      cancelled = true;
      chart?.destroy();
    };
    // payload is the stable signature of labels + series
  }, [payload, calm, labels, series, seen]);

  if (labels.length === 0) {
    return (
      <p className="py-16 text-center text-body-m text-black02/60">{caption}</p>
    );
  }

  return (
    <div>
      <div ref={frame} className="h-[28rem] w-full">
        <canvas ref={canvas} />
      </div>
      <p className="mt-3 text-caption text-black02/60">{caption}</p>
    </div>
  );
}
