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

## Changing it

- **Chase speed**: `EASE` in the component (0–1; higher is snappier).
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
