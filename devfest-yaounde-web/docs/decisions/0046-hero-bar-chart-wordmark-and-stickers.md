# 0046 — A wordmark that grows like a bar chart, over a photograph and a sticker cluster

Date: 2026-09-10
Status: Accepted — replaces the hero in ADR 0044 and 0045

## What happened to the previous direction

ADR 0044 and 0045 built a bottom-anchored wordmark with floating, cursor-
reactive facts, then tuned it for weight. A third pass began translating a
dark editorial reference — a coordinates meta line, a numbered `01–05`
contents index, a featured/showreel strip, and a photo panel the type passed
behind.

**That pass was never committed, and it was reverted whole rather than
adapted.** The organisers looked at it and picked a different reference. A
half-reverted direction is worse than either of the two it sits between, so
the tree went back to the last pushed commit before any of this was written.

What survived is what was never specific to that attempt: the preloader's dot
field, the DP generator's sticker sheet, `ContentImage`, and the hero's
pointer/scroll field.

## The composition

A photograph under everything, a dot-field texture over it, and content in two
columns above both. Left: a small logo-plus-organiser label, then a two-line
wordmark hugging the bottom-left. Right: tagline, the two CTAs, and the date
and venue set as figures. A cluster of the DP generator's own stickers is
spread across the middle — some in front of the wordmark, some behind it.

### The columns overlap, and they have to

The first attempt stacked them: right column pinned to the top, left column
pinned to the bottom, both in flow. **Every desktop viewport overflowed** —
1030px of content in a 900px window, with the bottom of "Yaoundé" cut off.
Measured, not guessed: 1440×900 overflowed by 130px, 1280×800 by 188px,
2560×1080 by 218px.

The reference does not stack them. Its statistics sit _beside_ the giant
wordmark's upper half, not above it. So the right column is `absolute` from
`sm` up and the left column owns the flow — they share vertical space and are
separated horizontally instead. Every viewport then fits exactly, and the
wordmark got _bigger_ rather than smaller as a result.

## The bar-chart reveal

Each character is its own inline-block, clipped from the bottom —
`inset(0 0 100% 0)` to `inset(0 0 0 0)` — so it grows upward out of nothing to
full height. The delay is a function of the character's index, so they arrive
left to right in sequence. Line two starts while line one is still going, so
the two read as one gesture rather than two events.

Verified mid-flight rather than assumed. A snapshot 1.75s in:

```
15.3% → 27.6% → 50.2% → 89.6% → 100% → 100% → 100%
```

— the first character nearly complete, the fourth barely begun, the last three
not started. That progression across the line is the entire analogy. All
fourteen settle at `inset(0px 0px 0%)`.

`clip-path` and not an animated height: height would relayout the line every
frame, and a per-character wrapper with `overflow: hidden` would clip the é's
accent with a box separate from the letter it belongs to. `clip-path` is
composited and clips the glyph itself, accent included.

### HTML text, reversing ADR 0044

ADR 0044 drew the wordmark as one SVG `<text>` with `textLength`, precisely
because that cannot pack or clip. It also makes every glyph one indivisible
node, and there is no way to clip and time a character inside a single
`<text>`.

The packing risk that protected against does not apply to this string:
**both lines are seven characters, and the wordmark is a brand name identical
in both locales.** There is no French length to blow the layout up. A `vw`
size is safe when the content is fixed; it was not safe when the old single
line had fifteen characters and had to span the full viewport.

### Weight

`700` is the boldest cut of Google Sans that is loaded — the family ships
400/500/600/700 (ADR 0004), so there is no extrabold to ask for.
`-webkit-text-stroke` adds a rim to every glyph, which reaches a weight the
font file does not contain without shipping a second family for two words.
**This is a substitution, not the real thing**, and it is the first of two
places the reference could not be matched literally.

## What moves and what does not

Deliberately split, and it reverses part of ADR 0044:

- **The wordmark does not move.** No pointer lean, no scroll recede. It
  reveals once and holds still.
- **The date and venue do not move.** They used to be floating cursor-reactive
  chips; they are figures now, and a figure that drifts reads as unreliable.
- **Everything reactive is scenery**: the stickers lean by depth and lift
  under the cursor, the dot field's highlight follows the pointer, the
  photograph pulls back as the section leaves.

The fixed things are the ones carrying information. That is the rule, and it
is why the "skittish venue" easter egg was retired with the floating facts.

## The sticker cluster

**The artwork is genuinely reused**: `drawStickerPreview` is the same routine
the DP generator's picker chips call, reading the same `stickers.ts` sheet. A
sticker added there appears in both places, drawn identically.

**The DP generator's sticker _interaction_ is not reused**, and this is the
second deviation from the brief. What lives there is a stateful editor —
pointer capture, drag deltas, per-sticker transforms in React state,
composited into a card the visitor is building and will download. It exists so
somebody can place a sticker and keep it.

A hero decoration has nothing to keep. Dragging one would be a control that
appears to do something and forgets it on the next page load, which is worse
than not being draggable at all. So these respond the way the rest of the
hero's scenery does — leaning by depth, lifting under the pointer.

`depth` and `blur` move together: near stickers lean further and stay sharp,
far ones barely move and go soft. Out of step, fake depth of field reads as an
effect rather than as distance.

**The cluster is authored twice**, desktop and mobile, rather than scaled
once. A percentage sitting in open space on a desktop lands on "Check the
swag" on a phone, because the phone stacks what the desktop puts side by side.
It did exactly that on the first pass.

## The backdrop, and the dot field's three new jobs

Photograph, flat scrim, dot field — in that order, with the field _over_ the
photograph so it reads as a texture pass on the image.

The scrim is one flat fill at one opacity, not a gradient (DESIGN.md §2.6).
It is heavier than it looks like it needs to be, because the photograph is
content an organiser uploads: its brightness is unknown, and the ink over it
cannot adapt. Tuned for a fully white photograph, which is the worst case.

`PreloaderDots` grew three things to serve both callers:

- **It sizes to its parent, not the window.** The preloader's parent is the
  viewport so nothing changed there; the hero's is a section whose height
  moves when the announcement banner is dismissed. A `ResizeObserver`
  replaced `window.innerWidth`.
- **`follow` points the highlight at the cursor** instead of drifting it on a
  timer — the brief described the preloader as mouse-reactive, and it never
  was. Eased, not snapped: a highlight that tracks exactly is a flashlight,
  and this is meant to be a spotlight wandering over a printed halftone. With
  no pointer seen yet it keeps drifting, so it is never parked in a corner.
- **It stops when nobody can see it.** The preloader's copy answered this by
  unmounting after 1.3s. The hero's never unmounts — without an
  `IntersectionObserver` it would hold a `requestAnimationFrame` open,
  redrawing a few hundred arcs a frame, while somebody read the FAQs.

It also runs at 45% opacity in the hero. At the preloader's own strength it is
a field on a blank screen; behind a headline, two buttons and a sticker
cluster it competes with all of them.

## Chrome clearance

The navbar and banner float over the page, and the banner can be dismissed, so
the space they take is not constant. The right column's offset is
`max(var(--chrome-h), 24vh)`: it wants to sit about a quarter down to match
the reference, but on a short window a quarter is less than the chrome
occupies. Whichever is larger wins, so dismissing the banner only ever gives
the hero more room — it can never take any away.

## Consequences

- `Satellite` is gone from `HeroField`, along with the skittish-venue egg —
  both belonged to the floating reactive facts this direction reverses.
  `HeroField` is now just the stage that writes `--px`/`--py`/`--exit`.
- **No new dependency.** `clip-path`, transforms, the existing preloader
  component and the existing sticker sheet.
- Verified: lint, typecheck, 170 tests (4 new — `eventDateParts`), build;
  screenshotted at 390/1440/2560 in both locales, reduced-motion, a themed
  variant, and with the banner dismissed; the reveal sampled mid-flight and at
  rest; every viewport measured to confirm the section is exactly the height
  of the window rather than overflowing it.
- **The photograph is still the labelled placeholder**, so its own artwork —
  the words "DevFest 2023" and "PLACEHOLDER PHOTO" — shows through the scrim.
  That is the placeholder doing its job, and it disappears the moment a real
  photograph is uploaded through the dashboard. The layering, sizing and
  scrim are what needed to be right, and they are.
