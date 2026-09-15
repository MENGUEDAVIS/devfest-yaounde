# The custom cursor

On desktop the pointer is replaced with a small solid dot plus a larger
**rounded arrow** that chases it with a slight lag — a soft, tail-less take on
the classic mouse arrow. It recolours with the footer theme switcher.

Code: [`src/components/global/CustomCursor.tsx`](../../src/components/global/CustomCursor.tsx)
and the `.cursor-*` block in `src/app/globals.css`.

## The three hard gates

A custom cursor is an accessibility hazard when it is done casually. These
are not optional degradations — they are the conditions for it running at all:

| Condition                        | Behaviour                                            |
| -------------------------------- | ---------------------------------------------------- |
| `pointer: coarse` / no `hover`   | Does not run. Touch keeps native behaviour.          |
| `prefers-reduced-motion: reduce` | Does not run. No chase, native cursor.               |
| JavaScript never runs            | Does not run, and the native cursor is never hidden. |

That last one is the important one structurally. The native cursor is hidden
**only** under `html.has-custom-cursor`, and that class is added **only** by
the component, **after** the checks pass. There is no CSS path that hides the
cursor without something drawing one in its place. If you ever move the
`cursor: none` rule out from under that class, you have introduced a bug
where a failed script leaves the user with no pointer at all.

Both media queries are watched with `addEventListener("change", …)`, so
plugging in a mouse, switching to touch, or toggling the OS motion setting
takes effect immediately without a reload.

## The other rules it must keep

- **The dot has no easing.** Only the ring lags. If the only visible cursor
  trailed behind the true hit point, every click would feel a few pixels off.
  Lag is decoration; the dot is the pointer.
- **The layer is `pointer-events: none`.** It is painted over the page and
  must never be hit-tested, or it would swallow every click under it.
- **Text inputs keep their native I-beam.** Losing the I-beam over a text
  field is a real usability regression, not a style choice. The ring fades
  out entirely over text (`[data-state="text"]`).
- **Focus states are untouched.** The cursor is a pointer affordance; keyboard
  users' focus rings are unaffected by it.

## How it is drawn

Position is written to CSS custom properties (`--cursor-x`, `--ring-x`, …)
inside a `requestAnimationFrame` loop, not held in React state. This runs on
every pointer move, and re-rendering a component tree at pointer frequency
for a decorative dot is not a trade worth making. The loop also parks itself
once the ring has caught up, so an idle page schedules no frames at all.

State is carried on `data-` attributes (`data-state`, `data-pressed`,
`data-visible`) and all the visual response lives in CSS.

## The image state — `data-cursor-image`

Any element with `data-cursor-image="<url>"` is a hover zone. Inside it the
dot and arrow fade out and a 320×200 picture card takes over, revealed with a
clip-from-centre plus a slightly bouncy scale, and dismissed with the reverse
when the pointer leaves. The home page figures use it (ADR 0057, sizing and
tilt reworked in ADR 0059).

- **Same cursor, not a second one.** Same layer, same rAF loop, same gates —
  so it can never run on touch or under reduced motion. Anything using it must
  show its image some other way for those visitors (`.stat-inline-image` is
  the pattern: hidden by CSS under exactly the cursor's media query).
- **Its own, lazier chase** (`IMAGE_EASE`, 0.11 vs the arrow's 0.18): a big
  picture tracking as tightly as a small arrow reads as glued on. Measured:
  after a fast move the card closes from 149px behind to 33px over 240ms.
- **Clamped** so the whole card stays on screen near a viewport edge —
  `IMAGE_HALF_W`/`IMAGE_HALF_H` must match half the card's real CSS size
  (`.cursor-image` in globals.css), or the clamp math and the visible box
  disagree near an edge.
- **`data-cursor-tilt="<deg>"`** on the same zone sets a static per-zone lean
  (`--image-tilt`), read once per zone-entry rather than animated in.
  Defaults to `-4deg` for a zone that doesn't set one. `StatCounter` uses
  this to alternate which way adjacent figures lean.
- **A gentle bob** once revealed — `.cursor-image-float`, gated to
  `[data-state="image"]` so a hidden card never animates. On its OWN nested
  element, and that placement is load-bearing: an animated `transform`
  entirely replaces any other `transform` declared on that same element for
  as long as it plays, so the bob cannot share `.cursor-image` (position +
  tilt) or the `img` (reveal scale) without silently overwriting one of
  them — the exact failure mode `.hero-sticker`/`.hero-sticker-inner` were
  already split to avoid.
- The zone wins over anything nested inside it. The `src` is kept on leave so
  the dismiss plays over the picture, not an empty box; it is swapped only on
  a real change.
- **`object-fit: cover`, on a frame shaped closer to a real landscape photo**
  (8:5, not the original 4:3) — widening the box rather than switching to
  `object-fit: contain` was the fix for images reading as over-cropped; this
  design system doesn't letterbox.

## Changing it

- **Chase speed**: `EASE` in the component (0–1; higher is snappier), and
  `IMAGE_EASE` for the picture card.
- **Shape**: the two `<path>`s in the component — keep them unicolor and
  keep them reading as the bracket motif.
- **Colour**: it uses `var(--color-contrast)` — the COMPLEMENT of the active
  theme (Blue↔Red, Yellow↔Green), per DESIGN.md §2.5. Do **not** switch this
  to `--color-primary`: a primary-coloured cursor sits on a same-family
  pastel wash for most of the page and effectively disappears. That
  visibility problem is the whole reason the pairing exists. And don't
  hardcode a family colour either, or it will stop following the theme.
- **Shape**: the single `<path>` in the component. Keep `stroke-linejoin` and
  `stroke-linecap` set to `round` — the stroke is what rounds the arrow's
  corners; the fill only closes it into a solid shape.
- **What counts as interactive**: the `INTERACTIVE` selector list. Add
  `data-cursor="grab"` to anything draggable that isn't a link or button —
  the sliders already carry it.

If it ever starts feeling janky or in the way, dial it back rather than
adding more to it. It is delight; it is not load-bearing.
