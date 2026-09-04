"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

export function AdminChart({
  labels,
  values,
  caption,
}: {
  labels: string[];
  values: number[];
  caption: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let chart: { destroy: () => void } | null = null;
    let cancelled = false;

    void import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled || !canvas.current) return;
      const styles = getComputedStyle(document.documentElement);
      const ink =
        styles.getPropertyValue("--color-black02").trim() || "#1f1f1f";
      const mark =
        styles.getPropertyValue("--color-primary").trim() || "#F9AB00";
      chart = new Chart(canvas.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data: values,
              borderColor: ink,
              backgroundColor: mark,
              pointBackgroundColor: mark,
              pointRadius: 3,
              borderWidth: 2,
              fill: false,
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: calm ? false : { duration: 700 },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
          },
          scales: {
            x: {
              ticks: { color: ink, maxRotation: 0 },
              grid: { display: false },
              border: { color: ink },
            },
            y: {
              beginAtZero: true,
              ticks: { color: ink, precision: 0 },
              grid: { color: "rgba(31,31,31,0.08)" },
              border: { color: ink },
            },
          },
        },
      });
    });

    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [labels, values, calm]);

  if (values.every((n) => n === 0) && values.length === 0) {
    return (
      <p className="py-8 text-center text-body-m text-black02/60">{caption}</p>
    );
  }

  return (
    <div>
      <div className="h-48">
        <canvas ref={canvas} />
      </div>
      <p className="mt-2 text-caption text-black02/60">{caption}</p>
    </div>
  );
}
