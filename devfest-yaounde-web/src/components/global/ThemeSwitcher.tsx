"use client";

import { useTranslations } from "next-intl";
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from "@/lib/theme";

/** Each swatch shows its own family colour, not the active theme's. */
const SWATCH: Record<Theme, string> = {
  blue: "bg-blue",
  red: "bg-red",
  yellow: "bg-yellow",
  green: "bg-green",
};

// --- external store: the theme lives on <html>, not in React state ---
const listeners = new Set<() => void>();
let cached: Theme = DEFAULT_THEME;

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  const next = isTheme(attr) ? attr : DEFAULT_THEME;
  if (next !== cached) cached = next;
  return cached;
}
function serverTheme(): Theme {
  return DEFAULT_THEME;
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Footer theme switcher — DESIGN.md §2.5.
 *
 * Four swatches in the specified order (Blue, Red, Yellow, Green); the active
 * one carries a ring. Clicking repaints the whole site client-side with no
 * refresh, because every themed surface reads the semantic custom properties
 * that `data-theme` swaps.
 *
 * The theme is read through `useSyncExternalStore` rather than React state:
 * the source of truth is the `data-theme` attribute, which is already set by
 * the pre-paint inline script before React hydrates. Holding it in state
 * would mean the server rendering "yellow" while the DOM already says "blue",
 * i.e. a hydration mismatch on every non-default theme.
 */
export function ThemeSwitcher() {
  const t = useTranslations("common.theme");
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  const select = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the theme still applies for this
      // session, it just won't be remembered. Not worth surfacing.
    }
    listeners.forEach((fn) => fn());
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span
        id="theme-switcher-label"
        className="font-mono text-mono-tag font-bold uppercase tracking-wide text-offwhite/55"
      >
        {t("label")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="theme-switcher-label"
        className="flex items-center gap-2.5"
      >
        {THEMES.map((name) => {
          const active = theme === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(name)}
              title={t(name)}
              className={`h-7 w-7 rounded-pill border-2 border-offwhite/40 transition-[transform,box-shadow] duration-200 ease-bouncy hover:scale-110 motion-reduce:transform-none ${
                SWATCH[name]
              } ${
                active
                  ? "ring-2 ring-offwhite ring-offset-2 ring-offset-black02"
                  : ""
              }`}
            >
              <span className="sr-only">{t(name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
