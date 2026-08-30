# Button

`src/components/ui/Button.tsx`

Chunky primary/secondary button per `DESIGN.md` §7b's boldness bar. Renders as a locale-aware `Link` when `href` is given (or a plain `<a>` with `external`), otherwise a real `<button>`.

## Props

| Prop        | Type                                                       | Default                                                                |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tone`      | `"yellow" \| "black02" \| "offwhite" \| "blue" \| "green"` | `"yellow"`                                                             |
| `variant`   | `"primary"` (filled) \| `"secondary"` (outline)            | `"primary"`                                                            |
| `size`      | `"lg"` (px-9 py-4, 18px label) \| `"md"` (px-7 py-3, 16px) | `"lg"`                                                                 |
| `radius`    | `"pill" \| "lg"`                                           | `"pill"`                                                               |
| `href`      | `string`                                                   | — renders a `Link` instead of a `<button>`                             |
| `external`  | `boolean`                                                  | with `href`, renders a plain `<a>` (for Bevy and other off-site links) |
| `onClick`   | `() => void`                                               | —                                                                      |
| `type`      | `"button" \| "submit"`                                     | `"button"` (ignored when `href` is set)                                |
| `className` | `string`                                                   | —                                                                      |

## Tone: yellow is the default, and that's deliberate

Per the base theme (`DESIGN.md` §2.5 / `docs/decisions/0005-base-color-theme.md`), yellow is the dominant brand color. `blue` and `green` exist for the sparing semantic cases — **don't reach for them just to make a section look different from its neighbour.** `black02` is the right choice for a high-contrast CTA sitting on a yellow surface.

## Motion

Hover lifts the button and grows a flat offset shadow (`shadow-[0_8px_0_0_black02]`); pressing pushes it back down and squashes it slightly. This uses the `--ease-bouncy` token directly rather than the one-shot `bouncyPop` keyframe, because a press is an ongoing interaction state, not an entrance. Flat offset shadows (never blurred gradients) keep this within `DESIGN.md` §2.6.

`motion-reduce:` variants disable the transform and transition entirely.

## Usage

```tsx
import { Button } from "@/components/ui/Button";

<Button tone="yellow" href="/tickets">Get Tickets</Button>
<Button tone="black02" variant="secondary" href="/shop">Shop</Button>
<Button tone="yellow" href={BEVY_URL} external>Join the Community</Button>
<Button onClick={() => setOpen(true)} size="md">Open</Button>
```

## Built on

`@/i18n/navigation`'s `Link` for internal navigation; Tailwind utilities otherwise.
