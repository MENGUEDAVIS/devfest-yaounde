# 0045 — Bolder, left-anchored, overlapping, and reactive to leaving

Date: 2026-09-10
Status: Accepted — tunes ADR 0044

## What the first pass got wrong

ADR 0044 shipped a correct, safe hero: bottom-anchored wordmark, floating
facts, empty space above. Feedback after looking at it: it read as _simple_,
not as bold — the type was thin for the amount of space it had, it was
centred rather than anchored, and every element sat in its own clean band,
never touching another. Three separate, non-overlapping problems, addressed
together because they compound: a composition that never lets anything touch
anything else cannot also read as confident.

## The wordmark: left, tighter, thicker

**Anchor changed from centre to `start`.** The first pass used
`textAnchor="middle"` with `textLength` at 98% of the box, which — because it
is symmetric — is visually indistinguishable from a deliberate left
alignment: the string reaches almost edge to edge either way, and "reaches
both edges by construction" reads as safe, not as placed.
`textAnchor="start"` at a small fixed inset, with `textLength` now **5%
shorter**, makes the left edge an actual decision: the line visibly stops
short of the right edge, and that gap is where the shapes and facts now sit.

**-5% tracking, applied as a width, not a CSS property.** `textLength`
already states the line's rendered width as a fact rather than a browser
guess (that is the whole reason it exists — see ADR 0044). A `letter-spacing`
value would fight that mechanism; reducing the target width by 5% instead
gets the same tracking effect through the technique already in place.

**Thicker via a stroke rim, not a heavier font file.** Google Sans is loaded
at 700 only (ADR 0004) — there is no 800 or 900 weight to reach for.
`stroke="currentColor"` at a small fraction of the font size adds a
consistent rim to every glyph, the standard way to fake a heavier cut without
shipping a second font weight. `strokeLinejoin="round"` keeps the added
weight rounded rather than sharp at the corners, matching DESIGN.md §5.

**The rendered size increased too**, and this is what caused the one real bug
in this pass — see below.

## The height-driven-by-width bug, on ultrawide only

The wordmark's _height_ follows its width, because a `viewBox` scales
uniformly — that is the mechanism that keeps it from packing on a phone. On
an ordinary screen that is exactly right. On a 2560×1080 monitor it is not:
the same width is far taller relative to the viewport, and the enlarged line
rendered at nearly 40% of the viewport's height — tall enough to push the
tagline into the floating date fact. **Found by screenshot at that exact
resolution, not by inspecting the coordinates**, which is the only way it was
going to be found: nothing about the numbers looks wrong in isolation.

The fix is a height cap, not a smaller base size everywhere. `max-h-[Xvh]`
alongside `w-auto h-auto max-w-full` (replacing a flat `w-full`) is the
standard responsive-image sizing algorithm applied to an SVG: width capped at
100% of the container, height capped at a fraction of the viewport, aspect
ratio preserved, whichever bound binds first. On every aspect ratio this
project ships on, the width bound is tighter and the line renders exactly as
designed, full width. Only a screen wide enough relative to its own height for
the height bound to win stops it short of the right edge — which is the one
case where reaching it would have made the line too tall, not the normal case
degrading to protect an edge case.

## The composition: one left mass, not a split row

The tagline and the two CTAs used to sit in one row with `justify-between` —
tagline left, buttons pinned to the far right. That balanced the bottom band
into two even halves, which is a _symmetric_ read, not a confident one. They
are stacked in one left column now, sharing the wordmark's own left edge, so
the eye reads logo → eyebrow → date → tagline → CTAs → WORDMARK as one
continuous left-anchored mass, with the shapes and the venue fact left free to
be the asymmetric counterweight on the right.

**The shapes are allowed to touch the wordmark now.** ADR 0044 kept three
strict horizontal bands specifically so nothing could collide — the right
call for shipping something that worked, and exactly why it read as tidy
rather than considered. The primary circle is bigger and hangs lower, low
enough to cross the wordmark's own top-right corner on `sm` and up (confirmed
by screenshot, then adjusted twice — the first attempt undershot, landing
short of the text; the current values were read off an actual render, not
assumed from the coordinates). The venue fact moved down to sit close enough
to read as overlapping it too, which was only possible because the CTA row
that used to occupy that corner moved into the left column.

**The shapes are desktop-only (`sm:block`), and that is a fix, not a
stylistic choice.** Enlarging and lowering the circle for the desktop overlap
used the same `vh`-based position on every breakpoint, and on a phone the
composition is shaped completely differently — the stacked layout puts the
tagline where the circle now sits. It landed on top of the tagline text,
found the same way as the ultrawide bug: by looking at the actual render, not
the numbers. Mobile does not need the shape for contrast anyway; the two-line,
two-colour split already carries it there.

## Reactive twice: the pointer, and leaving

**The wordmark itself now tilts with the pointer**, a fraction of a degree,
using `--px` — the same custom property `useHeroField` already writes for the
satellites, reaching the wordmark by ordinary CSS inheritance with no second
hook and no extra JS. Verified by setting `--px` directly and reading the
computed transform back: `rotate(0.6deg)` at the pointer's edge, matching the
`calc()` exactly. Before this the star element was the one thing in the
composition that did not react to anything.

**Everything recedes as the hero scrolls out from under the navbar.** A new
`--exit` custom property, 0 while the hero is on screen and easing to 1 as it
leaves, drives a lift, a slight scale-down and — on the wordmark specifically
— a fade. Verified two ways: reading `--exit` directly off the DOM at three
scroll positions (0, 0.59, 1.0, climbing exactly as expected), and by
screenshot at `scrollY: 500`, which shows the wordmark faded to a muted tint
against the crisp sponsor section already below it — the "leaving the scene"
cue the brief asked for.

This runs for every visitor, touch included — leaving is something scrolling
does, unlike the pointer lean, which stays gated on `(any-hover: hover)`.
Reduced motion is the only gate on the scroll listener.

### Why the exit transform lives on a NEW wrapper, not the existing ones

`.hero-word-line` already owns the entrance rise (`animation`, which sets
`transform` directly and would silently overwrite a second source on the same
property). `.hero-satellite` already owns the pointer lean on `transform`.
Rather than fight either for the property, the wordmark's exit and tilt live
on **`.hero-word-exit`**, a wrapper with no animation of its own — outside the
reveal mask, inside nothing that already claims `transform`. The satellites
and shapes take the opposite route: their exit term is _added into_ the
existing `calc()` on the same property, because there both influences are
already plain px offsets on the same axes, and a sum is simpler than a third
nesting level.

## Consequences

- `use-cursor-field.ts` is renamed `use-hero-field.ts`, exporting
  `useHeroField`. It does two independent things now (pointer, scroll) and
  the old name described only one.
- **The wordmark no longer reaches the right edge on ultrawide monitors.**
  Deliberate — see the height-cap section — and confirmed acceptable: the
  hard requirement was "most of the width," not "every pixel of it on every
  aspect ratio," and the alternative was a real collision.
- Verified: lint, typecheck, 167 tests, build; screenshotted at 390/1440/2560
  in both locales, reduced-motion, a themed variant, and three scroll
  positions; the pointer-tilt and scroll-exit custom properties read back and
  matched their `calc()` formulas exactly. `puppeteer-core` again installed
  `--no-save`, not a project dependency.
- **Not verified: the real pointer path**, same limitation as ADR 0044 —
  headless Chrome reports no pointer capability under any media query, so
  `(any-hover: hover)` gating the pointer-lean effect is reasoned about, not
  exercised. The scroll-exit effect has no such gap; it does not depend on
  pointer capability and was driven and read back directly.
