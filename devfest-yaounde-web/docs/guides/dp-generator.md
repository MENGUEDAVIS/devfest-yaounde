# The DP generator

`/{locale}/dp-generator` — a visitor drops in a photo, picks a style, crops
it, sticks things on it and downloads a DevFest profile card.

**It has no backend, and that is a decision, not an omission** (ADR 0015). The
photo is read with `createImageBitmap`, drawn onto a canvas and saved locally.
Nothing is uploaded, so there is no bucket, no EXIF handling, no retention
question and no rate limit to configure. It also keeps working when everything
else on the site is down, and the URL can be shared on its own.

## Where the pieces live

| File                                | Job                                                     |
| ----------------------------------- | ------------------------------------------------------- |
| `src/lib/dp/frames.ts`              | Styles and badges — **the file you edit each year**     |
| `src/lib/dp/stickers.ts`            | The sticker sheet                                       |
| `src/lib/dp/patterns.ts`            | The eight background patterns                           |
| `src/lib/dp/geometry.ts`            | The card's layout grid and its nested radii             |
| `src/lib/dp/compose.ts`             | Photo treatments, the plate, stickers, the render order |
| `src/lib/brand/devfest-mark.ts`     | The DevFest mark's path data, shared with the SVG logo  |
| `src/components/dp/DpGenerator.tsx` | The screen and all of its state                         |
| `src/components/dp/DpStage.tsx`     | Preview, crop control and sticker board in one          |
| `src/components/dp/pan.ts`          | Zoom range, the pan clamp, the rubber band              |
| `messages/{fr,en}.json`             | `pages.dpGenerator.*` and `errors.dp.*`                 |

## The layout grid

Everything is positioned from `geometry.ts`, so "aligned" is a property of the
geometry rather than of whoever last edited a magic number. Every length —
including the vertical ones — is a fraction of the card's **width**, which is
why a 3:4 card has the same margins and the same type size as a 1:1 card and
simply gets a taller photo.

The card's corners come in three cuts — **rounded** (the default and the
site's own language), **hard edge**, and **mixed** (square outside, rounded
inside, the classic mounted-photo treatment). The square options are a
DELIBERATE exception to the no-sharp-corners rule: that rule governs the
site's chrome, and this is artwork a visitor is making for themselves.

**Nested radii decrease inward, by exactly the padding between each pair** —
the standard `outer = inner + padding` rule:

```
card 0.135W  →  (pad 0.085W)  →  photo 0.050W  →  (pad 0.035W)  →  plate 0.015W
```

The plate ends up nearly square-cornered, and that is the rule working rather
than a mistake: a small element deep inside a very round one is supposed to
look like that. Matching the card's radius at every level is what looks wrong.
Four unit tests hold this, the centring and the ratio behaviour. With a
square outer edge there is nothing to subtract from, so the inner radii simply
stand on their own.

The outer padding is **8.5% of the card on every side**, and it is that wide
because the pattern is half the design. At 5% the photo swallowed the card and
eight carefully different styles all came out as the same picture with a
differently coloured hairline round it.

## Changing the styles for a new year

Edit `DP_FRAMES` in `src/lib/dp/frames.ts`. A style is **data**: colours, a
background pattern, and the plate the branding sits on.

```ts
{
  id: "confetti",
  label: { fr: "Confettis", en: "Confetti" },  // both languages, always
  background: "#FFE7A5",   // the card's ground
  accent: "#F9AB00",       // the badge, and most of the pattern
  foreground: "#1E1E1E",   // type on the plate
  plate: "#F9AB00",        // the branding plate
  pattern: "confetti",
  palette: [YELLOW, BLUE, GREEN, RED],  // pattern colours
  duotone: ["#1E1E1E", "#FFD427"],      // [shadow, highlight] for the effects
}
```

### The pattern vocabulary

| Name       | What it draws                                             |
| ---------- | --------------------------------------------------------- |
| `confetti` | Flat shapes, chevrons and stars scattered over the ground |
| `terrazzo` | Broken chips of the four brand families, with ink speckle |
| `halftone` | A dot field that thins across the card (DESIGN.md §2.4)   |
| `checker`  | A bold offset checkerboard of rounded squares             |
| `waves`    | Repeated brush arcs, like a printed pattern               |
| `grid`     | A drafting grid, with heavier rules and corner ticks      |
| `rays`     | Flat wedges radiating from the base — solid, not a ramp   |
| `tiles`    | Two-tone rounded tiling with an alternating weave         |

Two rules to check when you add a style:

- **The plate must not be the ground colour.** Two of the first eight were,
  and they were only readable because of their outline.
- **Flat fills only.** Every shape is one colour. A fill ramp would break
  DESIGN.md §2.6 and would be the only one on the site.

`confetti` and `terrazzo` also spill a few pieces in FRONT of the photo. It is
a small thing that does a lot — the photo stops being a rectangle pasted on a
background and starts being something the card is holding. Patterns made of
loose pieces get it; a checkerboard spilling over a photograph would just look
like a mistake.

## Effects

**Looks** (one at a time): as shot, duotone, halftone, black & white,
misprint (channel offset), screen print (posterised).
**Edges**: clean, torn, brushed — the edge is a mask, so a torn photo really
does leave its own corner behind.
**Textures** (independent): grain, paper, vignette, ripple, fisheye.

The fisheye distorts the picture rather than illustrating the idea of one: it
pulls every sample toward the centre by `r^1.55`, which magnifies the middle
and compresses the rim, like a door peephole. Because the radius is normalised
against the half-diagonal it never exceeds 1, so every sample lands inside the
photo — no stretched corners to paper over. An earlier version drew a
magnifying glass on top of the card instead.

All of it is 2D canvas: one geometric pass for the ripple and the channel
offset, one colour pass that does the look, the grain, the paper and the
vignette together, and a mask for the edge.

**There is no shader runtime and no image library.** The preview and the
export run the same `renderDp`, which is what lets a test read the downloaded
file back and compare it to the preview someone approved. A GL path fast
enough to matter would still need a 2D fallback for the export and for
machines without a context, and two renderers is exactly how a file stops
matching its preview. If an effect ever genuinely needs the GPU, that is the
moment for an ADR.

## Stickers

`SHAPE_STICKERS`, `TECH_STICKERS` and `TEXT_STICKERS` in
`src/lib/dp/stickers.ts`. The first two render in one row — they are both
shapes and behave identically, so a second heading only cost space. A shape is a
vector path in a 100×100 box; a word is a phrase in a rounded tag. Both get
the same treatment — a flat ink shadow, a heavy ink outline, a flat fill —
because that is what makes a sticker read as a sticker rather than as clip art
dropped on a photo.

The picker draws each chip with the compositor itself, so a chip cannot
advertise something the card will not draw.

Placement is deliberate rather than formulaic: shapes go round the photo on a
fixed ring, words stack down the middle where there is room for their width. A
single formula spread them evenly on paper and piled them on top of each other
in practice, because a word sticker is five times wider than a shape.

Stickers are clamped **at draw time**, not in state. Clamping the stored
position would need every control that can move one — including the size
slider, which changes the width after the fact — to know how wide it renders.

Nothing here reproduces a third-party logo: the "community" stickers are GDG
Yaoundé's own name and the event's own mark.

## Badges: attendance only, and why

`DP_BADGES` offers "I'll be there", "Count me in", "My first one" and "Back
again". It offers **no role badges**, and that is a decision (PHASE16 §4).

"Speaker", "Organiser" and "Volunteer" are claims about a role. With no login
and no backend there is nothing to check them against, so a self-selectable
Speaker badge means anyone can wear one — which devalues it for the people who
actually earned it. Everything on offer is a statement about yourself that
costs nobody anything if it turns out to be wrong.

**If role badges are ever wanted**, the two routes are a per-role unlock code
(weak, but maybe enough for a vanity badge — it would need a plain "this is a
soft check" line next to it) or real verification once accounts exist. Either
is a backend item: GAPS.md **G19**.

## Interactions

- **Tilt.** The card leans toward the cursor, which makes it read as an object
  rather than an image.
- **Rubber band.** Dragging the crop past its limit stretches the card and
  releases with a spring. Past the limit the crop stops moving, which on its
  own feels like the drag broke; letting the card follow a fraction of the
  extra distance says "there is nothing more here" in the language of every
  touch surface people already use.
- **One surface, two jobs.** A drag on a sticker moves the sticker; a drag
  anywhere else pans the photo. That rule is the whole interaction model, and
  it is what avoids a mode switch.
- **Keyboard.** With a sticker selected: arrows move it, `+`/`−` size it,
  `[`/`]` turn it, Delete removes it, Escape deselects. With nothing selected
  the same keys pan and zoom the crop.
- **Reduced motion turns off the tilt and the spring entirely**, and the sheet
  toggles instantly. Asserted, not assumed.

## Sharing

Two paths, and the difference between them is a platform limit, not a taste:

- **Where the browser can share files** (`navigator.canShare({files})`), one
  tap hands the image _and_ the caption to whatever app the person picks.
- **Copy** puts the card itself on the clipboard as PNG, for pasting straight
  into a post or a chat. Support is real but not universal and it needs a
  secure context, so a refusal is reported rather than swallowed — the
  download is right there.
- **Everywhere else**, no web API can attach an image to a post on someone's
  behalf. So the per-network buttons do the three things that _can_ be done —
  save the image, copy the caption, open the composer — and the screen says
  the image still has to be attached. Instagram has no web composer at all, so
  there it saves and stops rather than opening a link that goes nowhere.

The caption names **no accounts**. It carries the event hashtags and a CTA
pointing at `devfest.gdgyaounde.com/dp-generator`: a URL is verifiable and
cannot tag the wrong person (GAPS.md G16).

## The community wall

Everything above happens on the device. **One thing does not**, and only when
someone asks for it on that card: a smaller copy can be sent to GDG Yaoundé
for the community wall.

It is on (ADR 0033). `NEXT_PUBLIC_DP_GALLERY=0` is the explicit off: the
screen then renders no wall control at all — not a disabled one.
`src/lib/dp/gallery.ts` holds the client side; the endpoints live under
`/api/dp/gallery`. ADR 0021 is why this reverses ADR 0015 and what that costs.

Three properties worth knowing if you touch it:

- **The consent box is unticked for every card.** Consent to publish one
  picture of your face is not consent to publish the next one.
- **What uploads is not what downloads.** 640px JPEG, roughly thirty times
  smaller — a wall thumbnail, not the file someone saved.
- **No EXIF can reach the server**, because the card is drawn from a bitmap
  onto a canvas. The original file's GPS and camera data were never in those
  pixels. That is a property of the compositor, not a filter to remember.

## On a phone

The five control groups become a sheet pinned to the bottom of the screen,
with a tab bar and a hide button, and the card shrinks so both stay on screen
at once. It is **one DOM in two shapes** — `max-md:` / `md:` classes, not a
media-query mount — so nothing jumps at hydration and there is exactly one
copy of every control.

The sheet is deliberately **not** the shared `BottomSheet`. That one is modal:
scrim, focus trap, scroll lock. Every one of those would hide or freeze the
live preview this sheet exists to sit beside. `FilterLayout` makes the same
call for its persistent panel, and for the same reason.

Its height is capped by a formula tied to the tokens the card is sized by —
the screen, less the chrome, less the shrunken preview — rather than tuned by
eye. Asserted at 360px and 390px wide, on all five tabs.

## Limits worth knowing

- Accepted: JPEG, PNG, WebP, up to 12 MB. These are UX guards, not security
  controls — nothing leaves the device, so a bad file only spoils the render.
- Output is PNG at 1080 or 2160 wide; a 3:4 card is 1080×1440 or 2160×2880.
  The preview draws at 760 wide, and the export waits for
  `document.fonts.ready` so the file is never set in the fallback face the
  preview had already replaced.
- Twelve stickers per card. Past that it is not a card, it is a collage.
- The nickname is capped at 28 characters in the input because the plate
  prints 28; the two numbers are meant to stay equal. A long name shrinks to
  fit rather than being squashed.
- The year in the lockup comes from `EVENT.year` in `src/lib/event.ts`, taken
  from the chapter's own event slug. Re-check it against the real listing
  before launch.
- It needs JavaScript and `createImageBitmap`. There is no server-rendered
  fallback and there cannot be one.
