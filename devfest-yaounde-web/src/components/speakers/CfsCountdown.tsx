"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * How long is left to submit a talk.
 *
 * SERVER-RENDERED AS NOTHING, then filled in on the client. A countdown is
 * the one piece of a page that cannot be prerendered honestly: the HTML would
 * be cached with whatever "3 days left" was true when it was built, and the
 * next person to read it would be told something false. So the first paint is
 * the deadline in words, and the ticking version replaces it once there is a
 * clock to read.
 *
 * Under reduced motion it does not tick at all — it shows the days remaining
 * and stops. A number changing every second is motion, and someone who asked
 * for less of it has not asked for less information.
 */
export function CfsCountdown({ closesAt }: { closesAt: string }) {
  const t = useTranslations("cfs");
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = Date.parse(closesAt);
    if (Number.isNaN(end)) return;

    const tick = () => setRemaining(end - Date.now());
    tick();
    // A minute is enough for a deadline weeks away, and it is 60x less work
    // than a second hand nobody is watching.
    const id = window.setInterval(tick, calm ? 60_000 : 1000);
    return () => window.clearInterval(id);
  }, [closesAt, calm]);

  if (remaining === null || remaining <= 0) return null;

  const seconds = Math.floor(remaining / 1000);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: { value: number; label: string }[] = calm
    ? [{ value: days, label: t("days") }]
    : [
        { value: days, label: t("days") },
        { value: hours, label: t("hours") },
        { value: minutes, label: t("minutes") },
        { value: secs, label: t("seconds") },
      ];

  return (
    <div>
      <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
        {t("closesIn")}
      </p>
      {/*
        `aria-live` is deliberately absent. A screen reader announcing a new
        number every second would make the rest of the page unusable; the
        deadline is stated in words next to this, which is what actually needs
        to be readable.
      */}
      <ul aria-hidden className="mt-2 flex flex-wrap gap-2">
        {parts.map((part) => (
          <li
            key={part.label}
            className="flex min-w-16 flex-col items-center rounded-lg border-2 border-black02 bg-offwhite px-3 py-2"
          >
            <span className="font-sans text-heading-l font-bold tabular-nums leading-none text-black02">
              {String(part.value).padStart(2, "0")}
            </span>
            <span className="mt-1 font-mono text-caption uppercase text-black02/55">
              {part.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
