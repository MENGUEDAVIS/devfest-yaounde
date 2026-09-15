# StatCounter

`src/components/ui/StatCounter.tsx`

One home page figure: a big number that rolls in with the shared
[`Odometer`](odometer.md) when it scrolls into view, and — if it has an image —
a hover zone that turns the custom cursor into that picture (ADR 0057).

## Props

| Prop        | Type     | Default                                          |
| ----------- | -------- | ------------------------------------------------ |
| `value`     | `number` | required — whole, non-negative                   |
| `label`     | `string` | required — e.g. `"developers"`                   |
| `suffix`    | `string` | `""` — e.g. `"+"` for "500+"                     |
| `imageUrl`  | `string` | — optional picture; enables the cursor reveal    |
| `className` | `string` | —                                                |

## Motion

- **Entrance:** paints `0`, then sets the real value once ~40% of it is on
  screen (`IntersectionObserver`). Each digit column makes one extra full
  turn and they land left to right (`revolutions={1}`, `staggerMs={90}`,
  `durationMs={1100}` — DESIGN.md §6.2 macro tier).
- **Reduced motion:** the final value from the start, no transition.
- **Screen readers** always get the real figure (`srText`); the rolling digits
  are `aria-hidden`, and the odometer is not a live region here.

## The image

| Visitor                                      | What they get                                           |
| -------------------------------------------- | ------------------------------------------------------- |
| Mouse/trackpad, motion allowed               | Hover zone → cursor becomes the image card, trailing    |
| Touch, no hover, or `prefers-reduced-motion` | The image shown inline above the number, always visible |
| Figure without an image                      | Just the number                                         |

The inline image is hidden by CSS (`.stat-inline-image`) under exactly the
media query `CustomCursor` runs under, so one of the two is always there and
never both. The zone is padded past the glyphs (24px sideways, 16px
vertically) with a matching negative margin, so it does not move the layout.

## Usage

```tsx
<StatCounter value={500} suffix="+" label="developers" imageUrl={url} />
```
