# Preloader

The branded screen on first load: a decoding wordmark over a drifting field of
dots, held briefly and then gone.

| File                                      | Job                                          |
| ----------------------------------------- | -------------------------------------------- |
| `src/components/global/Preloader.tsx`     | The overlay, the timing, the scroll lock     |
| `src/components/global/PreloaderDots.tsx` | The dot field and its drifting highlight     |
| `src/lib/use-scramble.ts`                 | The scramble engine, shared with page titles |

## The four decisions

**It is server-rendered.** It sits in the first HTML, so it covers the page
from the first paint rather than flashing the site and then hiding it. Mounted
by the root layout, which does not remount on client navigation — so moving
between pages never shows it again, and a genuine reload does.

**The wordmark is SVG, and `textLength` is the reason.** The line fills ~80% of
the viewport, and a scramble swaps every glyph several times a second. In HTML
with a proportional face that means the whole wordmark twitching wider and
narrower at 60fps, which at this size is unmissable. `textLength` with
`lengthAdjust="spacing"` pins the width and lets letter-spacing absorb the
difference, so glyphs keep their shape and the line never moves.

**The dots never change colour.** They are ink, always. What animates is their
_opacity_: a soft highlight drifts over the field and the dots under it come
up — a spotlight wandering over a printed halftone, not a colour cycle. The
drift is a sum of sines at unrelated periods, so the path never closes into a
visible loop and needs no state between frames. Canvas rather than CSS,
because a per-dot opacity falloff is not something a background-image can
express, and a repeating radial gradient would be a gradient (DESIGN.md §2.6).

**The theme reaches the wash only.** `bg-pastel` follows the saved theme, which
the inline script in `<head>` has already applied before first paint. Text and
dots stay `#1E1E1E` in every theme.

## Timing

`HOLD_MS` 1300, then a 320ms fade. The hold starts at mount rather than at
"app ready", because by the time this component runs the app **is** ready —
there is nothing left to wait for, and pretending otherwise would be a
progress bar for a load that already finished.

## The scroll lock has two halves, and it needs both

- **`html:has([data-preloader])` in `globals.css`** covers first paint. The
  effect's lock does not run until hydration — measured ~120ms later — and for
  that window the page could otherwise be scrolled behind a screen meant to be
  covering it. The CSS rule unlocks itself when React removes the node.
- **`lockScroll()` in an effect** covers everything after hydration, for as
  long as the component stays mounted.

**The effect is keyed on `gone`, not on unmount**, and that distinction was a
real bug. A component that returns `null` is still _mounted_, so an effect
keyed on unmount never re-runs its cleanup — the inline `overflow: hidden`
would have stayed on `<html>` and `<body>` forever, and the page would have
been permanently unscrollable after the splash. A test now wheels the page
with reduced motion on, where nothing papers over it.

## Accessibility

The overlay is `aria-hidden` and holds nothing focusable: a screen reader walks
straight past it to the real page, and a keyboard user is never trapped behind
it. Focus is deliberately **not** trapped. Under `prefers-reduced-motion` the
wordmark never scrambles and the highlight never drifts — one static frame,
same brief duration.

## Changing it

The wordmark is `WORDMARK` in `Preloader.tsx`. Dot spacing, radius, tilt and
the two opacity bounds are the constants at the top of `PreloaderDots.tsx`.
Anything that scrambles text should use `useScramble` rather than a second
copy of the pacing and glyph set — that is how two things meant to look
identical drift apart.
