/**
 * Swappable dominant theme — DESIGN.md §2.5.
 *
 * One dominant colour family at a time. Yellow is the DEFAULT, not the only
 * option. Switching writes `data-theme` on <html>, which flips the
 * `--color-primary / --color-halftone / --color-pastel` custom properties in
 * globals.css — so every component using the semantic tokens repaints with
 * no re-render and no page refresh.
 *
 * Status colours (`--color-success`, `--color-danger`) deliberately do NOT
 * follow the theme, so green keeps meaning success and red keeps meaning
 * error whichever family is dominant.
 */
export const THEMES = ["blue", "red", "yellow", "green"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "yellow";
export const THEME_STORAGE_KEY = "devfest-theme";

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" && (THEMES as readonly string[]).includes(value)
  );
}

/**
 * Inlined in <head> and run before first paint, so a saved non-default theme
 * never flashes yellow first. Kept deliberately tiny and dependency-free —
 * it is stringified into the document.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var v=${JSON.stringify(
  THEMES,
)};if(t&&v.indexOf(t)>-1){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
