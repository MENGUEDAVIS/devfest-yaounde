# The DP generator

`/{locale}/dp-generator` — a visitor drops in a photo, picks a frame, crops it
and downloads a square DevFest profile picture.

**It has no backend, and that is a decision, not an omission** (ADR 0015). The
photo is read with `createImageBitmap`, drawn onto a canvas and saved locally.
Nothing is uploaded, so there is no bucket, no EXIF handling, no retention
question and no rate limit to configure. It also keeps working when everything
else on the site is down, and the URL can be shared on its own.

## Where the pieces live

| File                                | Job                                                 |
| ----------------------------------- | --------------------------------------------------- |
| `src/lib/dp/frames.ts`              | The frame catalog — **the file you edit each year** |
| `src/lib/dp/compose.ts`             | The compositor: mask, cover-fit, nickname, wordmark |
| `src/lib/dp/share.ts`               | Web Share API, clipboard fallback, caption          |
| `src/components/dp/DpGenerator.tsx` | The screen and all of its state                     |
| `src/components/dp/DpStage.tsx`     | The live preview, which is also the crop control    |
| `src/components/dp/pan.ts`          | Zoom range and the pan clamp                        |
| `messages/{fr,en}.json`             | `pages.dpGenerator.*` and `errors.dp.*`             |

## Changing the frames for a new year

Edit `DP_FRAMES` in `src/lib/dp/frames.ts`. Nothing else needs to change — the
picker, the swatches, the empty-state preview and the canvas all read from that
array, and the swatch draws each frame's own mask shape.

A frame is **data, not code**: colours, a mask, and a list of decorations the
compositor already knows how to draw.

```ts
{
  id: "confetti",                              // stable, used in state
  label: { fr: "Confettis", en: "Confetti" },  // both languages, always
  background: "#FFE7A5",   // the card behind everything
  accent: "#F9AB00",       // the ring, the badge, most of the art
  foreground: "#1E1E1E",   // the nickname and wordmark
  mask: "rounded",         // "rounded" | "circle"
  decorations: ["confetti", "sparkles"],
  palette: [YELLOW, BLUE, GREEN, RED],   // confetti/sparkle colours
  duotone: ["#1E1E1E", "#FFD427"],       // [shadow, highlight] for the effect
}
```

### The decoration vocabulary

| Name       | What it draws                                             |
| ---------- | --------------------------------------------------------- |
| `confetti` | Flat shapes scattered in the margin, never on the photo   |
| `sparkles` | Small four-point stars                                    |
| `brackets` | The DevFest angle-bracket motif, in opposite corners      |
| `halftone` | A dot field that thins across the card (DESIGN.md §2.4)   |
| `stripes`  | A diagonal band across a corner, passing behind the photo |
| `tape`     | Two strips of tape holding the photo down                 |
| `dashRing` | A dashed outline offset outside the photo                 |
| `postcard` | A thick inner border, like a print with a white margin    |

Mix them freely — any frame can use any of them, and a new combination costs
one line. Decorations are drawn either beneath the photo or over it; the
`BENEATH` list in `compose.ts` decides which, and the photo is what makes a
`stripes` band read as passing behind someone's shoulder.

Two rules hold everything together, and both are enforced by geometry rather
than by care:

- **Nothing lands on a face.** Every scattered decoration rejects candidate
  points inside the photo box.
- **Nothing lands on the type.** `TEXT_BAND_TOP` marks where the badge, the
  name and the wordmark live; the dot field stops there, and confetti avoids
  the centred column through it while still filling the bottom corners.

Two things to check when you add a frame:

- **Contrast.** `foreground` sits on `background` and has to be readable at a
  36px avatar. The existing eight pair a dark foreground with a pale ground, or
  the reverse — do not add a mid-tone pair.
- **Flat fills only.** `background` is a single colour, and so is every shape.
  A fill ramp would break DESIGN.md §2.6 and would be the only one on the site.

The first entry is `DEFAULT_FRAME_ID`, so put the year's lead frame first.

### Badges

`DP_TAGS`, in the same file, is the sticker that straddles the bottom of the
photo — "I'll be there", "Speaker", "Organiser", "Volunteer", and `none`. They
are kept apart from the frames because any badge works with any frame; folding
them together would multiply the catalog for nothing. `text` is what gets
printed (upper case, both languages); `label` is what the picker shows.

### Effects

Four looks — `none`, `duotone`, `halftone`, `mono` — plus two independent
toggles, grain and vignette. They apply to the photo only, on its own layer,
before the ring and the badge go on top.

All of it is 2D canvas: one pass over an ImageData buffer for the look, the
grain and the vignette together, and a few hundred `arc` calls for the halftone
dots. **There is no shader runtime and no image library**, and that is
deliberate — a WebGL pipeline would mean shader sources, a program cache,
context-loss handling and a second code path for the export, to make something
imperceptibly faster on a region 734px square. If an effect ever genuinely
needs the GPU, that is the moment for an ADR.

A frame's `duotone` pair also drives the halftone's two colours, so a new frame
gets sensible effects for free.

## The mask shape is still deliberately plain

`PAGES.md` §9 asks for the morphed-shape motif and `DpMask` offers only
rounded rectangles and circles. That follows DESIGN.md §4.2: do not approximate
the signature shape until the real asset exists. When it does, extend `DpMask`
and `clipToMask` in `compose.ts` — the UI needs no change (GAPS.md G17).

## What the crop control actually does

The thing you drag **is** the card you download, at the same proportions with
the nickname and wordmark already on it. There is no separate "crop box" whose
output you then discover.

Pan is stored as `offsetX` / `offsetY` in **fractions of the photo box**, and
zoom as `scale`, where 1 means "covers the box exactly". Every control that can
move the crop — drag, arrow keys, the zoom slider — goes through
`clampTransform`, so none of them can reach a state the others cannot, and
zooming back out pulls the pan in with it.

The clamp needs no geometry from the compositor: the box cancels out of the
arithmetic, leaving aspect ratio and zoom (see the comment in `pan.ts`). The
one number that IS shared is `PHOTO_BOX_RATIO` in `DpStage.tsx`, which converts
pointer travel into pan. If the compositor's margins ever change, that constant
makes dragging feel slightly fast or slow — it cannot produce a wrong render.

## Sharing

Two paths, and the difference between them is a platform limit, not a taste:

- **Where the browser can share files** (`navigator.canShare({files})` — the
  share sheet on Android and iOS, and some desktop browsers), one tap hands the
  image _and_ the caption to whatever app the person picks. That is a real
  image post to Instagram, WhatsApp, X or LinkedIn.
- **Everywhere else**, no web API can attach an image to a post on someone's
  behalf. So the per-network buttons do the three things that _can_ be done —
  save the image, copy the caption, open the composer — and the screen says the
  image still has to be attached. Instagram has no web composer at all, so
  there it saves and stops rather than opening a link that goes nowhere.

LinkedIn takes a URL and ignores prefilled text (its `shareArticle` text
parameter was removed), which is why every fallback also copies the caption: on
LinkedIn, pasting is the only way the words arrive.

The caption is built once in `shareCaption` and shown on the page exactly as it
is sent, so what someone reads is what gets posted. It carries the event
hashtags and a CTA pointing at `devfest.gdgyaounde.com/dp-generator`.

It names **no accounts**. A URL is verifiable and cannot tag the wrong person; a
guessed handle tags a stranger on every post, and none of the chapter's
profiles are confirmed. See GAPS.md G16.

## Limits worth knowing

- Accepted: JPEG, PNG, WebP, up to 12 MB. These are UX guards, not security
  controls — nothing leaves the device, so a bad file only spoils the render.
- Output is PNG at 1080×1080, or 2160×2160 with the big option. The preview
  draws at 720 for speed, and the export waits for `document.fonts.ready` so the
  file is never set in the fallback face the preview had already replaced.
- The nickname is capped at 28 characters in the input because the card prints
  28; the two numbers are meant to stay equal.
- It needs JavaScript and `createImageBitmap`. There is no server-rendered
  fallback and there cannot be one.

## On a phone

The same four control groups become a sheet pinned to the bottom of the screen,
with a tab bar and a hide button, and the card shrinks so both stay on screen at
once. It is **one DOM in two shapes** — pure `max-md:` / `md:` classes, not a
media-query mount — so nothing jumps at hydration and there is exactly one copy
of every control.

The sheet is deliberately **not** the shared `BottomSheet`. That one is modal:
scrim, focus trap, scroll lock. Every one of those would hide or freeze the live
preview this sheet exists to sit beside. `FilterLayout` makes the same call for
its persistent panel, and for the same reason.

Its height is capped by a formula tied to the tokens the card is sized by — the
screen, less the chrome, less the shrunken preview — rather than tuned by eye,
so the card cannot end up behind it on a shorter phone. That is asserted at
360px and 390px wide, on all four tabs.
