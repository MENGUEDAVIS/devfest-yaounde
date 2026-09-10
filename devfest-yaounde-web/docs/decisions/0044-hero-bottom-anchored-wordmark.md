# 0044 — The hero is a wordmark at the bottom and empty space above it

Date: 2026-09-10
Status: Accepted — replaces the hero described in ADR 0041

## What was wrong with the last one

ADR 0041 made the previous hero cheaper and fixed its dates. It did not make
it interesting. Every element sat in one centred column over a drifting photo
collage — which is the layout a page falls into when nobody decides on one.
It was fine, and forgettable, and had been bounced more than once.

This is a clean sheet, not a tune-up.

## The composition

**The mass is at the bottom.** The navbar owns the top, so the star element
hugs the lower edge and the upper half is left deliberately empty. That
emptiness is the design: a huge thing in a crowded frame is noise, and the
same thing with room around it reads as confident — DESIGN.md §7b, "exaggerated
size only reads as confident if it has room".

**The facts float.** Date and venue are not a block under a headline; they are
placed around the empty half, absolutely positioned, leaning toward the
pointer. They cost no layout space, which is what lets the wordmark have all
of it.

**Two flat shapes and the bracket mark** furnish the upper space — three
elements, each large, each doing one job, rather than a texture of small ones.
Flat fills, theme tokens, no gradients.

## SVG `textLength` is why it does not pack on a phone

The brief is "spanning most of the width" at every viewport, and CSS cannot do
that honestly. `clamp()` guesses a size from the viewport and hopes the string
happens to fill it — which is exactly how the old hero packed and clipped on a
phone, and how French copy breaks a layout tuned on English.

```
<text textLength="98" lengthAdjust="spacing" …>DevFest Yaoundé</text>
```

states the width as a fact: the line IS 98 units of a 100-unit viewBox, and
letter-spacing absorbs whatever the glyphs need. The viewBox scales to any
container, so 390px and 2560px are the same drawing at different sizes.
Nothing to pack, nothing to clip, and the é keeps its accent because it is
real text rather than a bitmap.

It is also what the preloader already does, which is the point of doing it
here: the splash and the hero are the same wordmark drawn the same way, so the
handoff reads as one object arriving rather than two animations colliding. The
reveal is held until the splash starts leaving, by the mechanism from ADR 0041.

### One line, or two

**One line from `sm` up.** Fifteen characters across the width is a dense,
solid block of grotesk, and it costs about a fifth of the viewport — which is
what leaves the empty upper half the whole composition is built on.

The first attempt used two lines everywhere at `fontSize 14` in a `100×17`
viewBox. That is 7 glyphs stretched across 98 units, so the letter-spacing was
enormous and the type read as thin and airy rather than as a mass — and two
lines of it ate 490px of a 900px screen. The sizes here come from the real
glyph advances instead: a seven-character line needs about `fontSize × 4` of
width, a fifteen-character one about `fontSize × 8.2`, and each viewBox is
cropped to cap height plus room for the é's accent so the line hugs its own
type.

**Two lines below `sm`**, because one line of fifteen characters on a 390px
phone is 35px tall — technically full-width, and far too thin to be the star
of anything.

## The floating layer is a desktop layer

On a 390×844 phone the bottom cluster — tagline, two CTAs, a two-line
wordmark — already reaches past halfway, so a fact positioned at "41vh" lands
on top of the tagline. **It did, and it was unreadable.** No amount of tuning
percentages survives a cluster whose height depends on how long the French
copy runs.

Below `sm` the same facts are laid out **statically inside the cluster**,
which is the "tasteful static placement" the brief allows on touch and which
cannot collide with anything because it is in the flow. Both copies are
`display: none` when not in use, so neither is duplicated to a screen reader —
and the `aria-hidden` that was briefly on the desktop layer was a bug, since
that is the visible one on the screens it applies to.

## Cursor parallax at two style writes per frame

The naive version stores the pointer in React state and re-renders every
satellite on every mousemove. This writes **two custom properties on the
container** — `--px` and `--py`, each a unitless -1..1 — and each satellite
multiplies by its own `--depth` in CSS. One write moves all of them, on the
compositor, with React uninvolved after mount.

Values are eased toward the pointer in a rAF loop rather than snapped, which
is what makes it read as drift rather than as a cursor-follower, and **the loop
stops when it settles**: an idle hero should not hold a frame callback open.

The two transforms are composed by **nesting** — the outer element is the
cursor's, an inner span carries the ambient drift — rather than trying to sum
two animations onto one node.

### `any-hover`, not `hover`

`(hover: hover)` asks about the _primary_ pointer, and on a touchscreen laptop
that is the touchscreen — so a machine with a trackpad right there would be
told it has no mouse. `(any-hover: hover)` asks whether any attached input can
hover, which is the actual question. Phones and tablets still answer no.

## It has to work standing still

Under `prefers-reduced-motion` nothing moves: no reveal, no drift, no cursor
response. What is left is the composition, which is the thing that was
designed. Verified by screenshot, not by reasoning — it is identical to the
animated resting state.

The reduced-motion rule is `transform: none`, **not** `animation: none` alone:
that would park the wordmark at `translateY(105%)`, i.e. off the bottom of its
own mask, and the hero would be blank for exactly the people who cannot see it
move.

## The OG card had the wrong date, again

`/og` printed a hand-typed `DEVFEST YAOUNDÉ 2026 · 21–22 NOV`. A social card is
the worst place for a stale date: it is cached by whoever unfurls the link, so
the wrong one keeps being served long after the site is right.

It is derived from `formatEventDates` now, and says **when and where** rather
than repeating the event's name — which is the headline directly below it in
type three times the size. Repeating it cost a line: the name-plus-date version
wrapped onto two rows and pushed the card's whole text column down. The route
also takes a `locale`, so a French page unfurls in French.

Both cards were rendered and looked at.

## Consequences

- **The sponsor strip moved out of the hero.** It was layer 4 inside it; two
  things cannot both hug the bottom edge. Same strip, same place on screen,
  one section later in `page.tsx`.
- **The desktop wordmark is monochrome**, where the mobile split colours
  "Yaoundé" with the theme. Colouring the one-liner means `<tspan>`s, and the
  scramble hook rewrites `textContent` — which would flatten them on first
  click. The egg is worth more than the second colour; the ground, both shapes
  and the CTA already carry the theme.
- **No new dependency.** rAF, transforms and the existing motion setup.
- `puppeteer-core` was installed with `--no-save` to take the screenshots and
  is not in `package.json`.

## What is verified, and what is not

Screenshotted at 390, 1440 and 2560, in both locales, plus reduced-motion and
a themed variant. The scramble egg was driven and resolves correctly. The
parallax **CSS** was verified by setting `--px`/`--py` and reading the computed
transforms — depth 26 gives 26px, depth 46 gives 46px, so the layers do
separate.

**The pointer path itself is not verified.** Headless Chrome reports no pointer
capability under any media query, and puppeteer cannot emulate `any-hover`, so
the gate that decides whether to attach the listeners at all has been reasoned
about rather than exercised. Somebody with a mouse should confirm the facts
actually lean.
