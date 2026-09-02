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

```ts
{
  id: "sunrise",                                    // stable, used in state
  label: { fr: "Lever de soleil", en: "Sunrise" },  // both languages, always
  background: "#FFE7A5",  // the card behind the photo
  accent: "#F9AB00",      // the ring, and the wordmark
  foreground: "#1E1E1E",  // the nickname
  mask: "rounded",        // "rounded" | "circle"
}
```

Two things to check when you add one:

- **Contrast.** `foreground` sits on `background` and has to be readable at a
  36px avatar. The existing five pair a dark foreground with a pale ground, or
  the reverse — do not add a mid-tone pair.
- **Flat fills only.** `background` is a single colour. A gradient would break
  DESIGN.md §2.6 and would be the only one on the site.

The first entry is `DEFAULT_FRAME_ID`, so put the year's lead colour first.

## The shape is deliberately plain

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

`shareDp` tries the share sheet with the actual PNG attached, and falls back to
copying the caption. It returns which of the three happened — `shared`,
`copied`, `unavailable` — and the screen says so out loud, because a tap that
does nothing visible reads as broken.

The caption is built once in `shareCaption` and displayed on the page exactly
as it is sent, so what someone reads is what gets posted. It carries the event
hashtags and a link back to the current origin — **not** a hardcoded domain, so
preview deployments link to themselves.

It carries **no community handles**, because none are confirmed yet; see
GAPS.md G16 before adding any.

## Limits worth knowing

- Accepted: JPEG, PNG, WebP, up to 12 MB. These are UX guards, not security
  controls — nothing leaves the device, so a bad file only spoils the render.
- Output is always 1080×1080 PNG. The preview draws at 720 for speed.
- The nickname is capped at 28 characters in the input because the card prints
  28; the two numbers are meant to stay equal.
- It needs JavaScript and `createImageBitmap`. There is no server-rendered
  fallback and there cannot be one.
