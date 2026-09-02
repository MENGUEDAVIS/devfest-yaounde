"use client";

import { GridFour, Cards } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useId } from "react";

export type PersonView = "grid" | "slider";

/**
 * Grid ↔ Slider toggle for /speakers and /team (PHASE9 §4).
 * Same visual language as the schedule's structured/list toggle so the two
 * read as one pattern rather than two inventions.
 *
 * Desktop/tablet only — see the comment on the wrapper below.
 */
export function ViewToggle({
  view,
  onChange,
}: {
  view: PersonView;
  onChange: (v: PersonView) => void;
}) {
  const t = useTranslations("common.views");
  const labelId = useId();

  /*
   * Available on mobile again. It was hidden below `md` while the slider was
   * an in-page section that had no room there — but the slider is now a
   * full-screen lockup, which is if anything a BETTER fit for a phone than
   * for a desktop: it owns the whole screen either way.
   */
  return (
    <div className="flex items-center gap-3">
      <span
        id={labelId}
        className="hidden font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50 sm:inline"
      >
        {t("label")}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex overflow-hidden rounded-pill border-2 border-black02"
      >
        {(
          [
            ["grid", GridFour, t("grid")],
            ["slider", Cards, t("slider")],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={view === key}
            className={`flex items-center gap-2 px-4 py-3.5 font-mono text-mono-tag font-bold uppercase tracking-wide transition-colors duration-200 ${
              view === key
                ? "bg-black02 text-offwhite"
                : "bg-transparent text-black02 hover:bg-pastel"
            }`}
          >
            <Icon size={16} weight="bold" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
