# 0011 — Runtime theme switching

- **Status:** Accepted
- **Date:** 2026-08-30
- **Supersedes in part:** [0005 — Base colour theme](0005-base-color-theme.md)

## Context

ADR 0005 established ONE dominant colour family at a time, with Yellow as the
base — the rule that stopped the site reading as a Google-four-colour rainbow.
It assumed that choice was made once, at build time.

The chapter runs this site every year, and reuses it. A fixed yellow build
means next year's edition either ships yellow or needs a code change across
every component that names a colour. PHASE10 asks for the choice to move to
the visitor, in the footer: four circles (Blue, Red, Yellow, Green), the
active one ringed, repainting the site without a reload and remembering the
choice.

## Decision

Themes are **semantic CSS custom properties swapped by a `data-theme`
attribute on `<html>`**.

```
--color-primary   /* the dominant family */
--color-halftone  /* its bright accent  */
--color-pastel    /* its section wash    */
```

Components reference `bg-primary` / `bg-pastel` / `bg-halftone`. Naming a
family directly (`bg-yellow-pastel`, `var(--color-yellow)`) is a bug: the
theme swap will visibly miss it.

Three consequences worth stating:

1. **No re-render.** The switch writes one attribute. Every themed surface
   repaints through the cascade — React is not involved in the paint at all,
   so this is O(1) in the number of themed components.

2. **Status colours are FIXED, not themed.** `--color-success` /
   `--color-danger` resolve to green and red under every theme. If they
   followed the dominant family, the Red theme would render the whole site as
   an error state and the Green theme would make everything look like a
   confirmation — the semantic meaning of the colour would be destroyed by a
   decorative choice. This is why `Badge`/`Button` tones are named
   `primary` / `success` / `danger` rather than `yellow` / `green` / `red`.

3. **The switcher reads `data-theme`, it does not own it.** `ThemeSwitcher`
   uses `useSyncExternalStore` against the DOM attribute. Holding the theme
   in React state would mean the server rendering "yellow" while the DOM
   already said "blue" — a hydration mismatch on every non-default theme.

A tiny inline script in `<head>` (`THEME_INIT_SCRIPT`) applies the saved theme
**before first paint**, so a returning visitor never sees a flash of yellow.

## Alternatives considered

- **A CSS class per theme on `<body>`.** Equivalent in effect, but every
  themed rule then needs a `.theme-blue &` variant, which multiplies the
  stylesheet by four and makes "did I miss one?" unanswerable. One attribute
  swapping three variables has exactly one place to check.
- **Server-side theme via cookie.** Would avoid the inline script, but makes
  every page dynamic and can't respond to the switch without a round trip.
  The inline script is ~200 bytes.
- **Theming the brand logo too.** Rejected — the DevFest mark is Google's
  four-colour brand asset. `DevFestLogo.tsx` and `icon.svg` keep their raw
  hexes deliberately; they are the only files outside `globals.css` that
  should contain one. Placeholder photography is likewise not re-themed.

## Scope of the refactor

Measured before starting: **60 utility usages across 22 files**, all
mechanical (`bg-yellow-pastel` → `bg-pastel`, `tone="yellow"` → `tone="primary"`).
Small enough to do in one pass rather than split.

## Consequences

- A new component must use the semantic tokens. A family-named colour will
  pass review by eye under the default theme and break under the other three.
- Contrast holds across all four families because the pastel/black02 and
  offwhite/black02 pairings are unchanged; only the hue moves.
- DESIGN.md §2.5 is the normative statement of this; this ADR records why.
