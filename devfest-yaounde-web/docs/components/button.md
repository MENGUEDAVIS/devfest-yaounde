# Button

`src/components/ui/Button.tsx`

Primary (filled) / secondary (outline) button in pill or md radius, `DESIGN.md` §5.2/§8. Renders as a locale-aware `Link` (from `@/i18n/navigation`) when `href` is given, otherwise a real `<button>`.

## Props

| Prop        | Type                                                  | Default                                               |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `tone`      | `"blue" \| "green" \| "yellow" \| "red" \| "black02"` | `"blue"`                                              |
| `variant`   | `"primary" \| "secondary"`                            | `"primary"`                                           |
| `radius`    | `"pill" \| "md"`                                      | `"pill"`                                              |
| `href`      | `string`                                              | — (renders a `Link` instead of a `<button>` when set) |
| `onClick`   | `() => void`                                          | —                                                     |
| `type`      | `"button" \| "submit"`                                | `"button"` (ignored if `href` is set)                 |
| `className` | `string`                                              | —                                                     |

`tone` picks the core color — map it to the relevant section per `DESIGN.md` §2.5 (e.g. `yellow` for a Tickets CTA, `green` for Shop, `blue` for general Event actions).

## Motion

`DESIGN.md` §6.1 lists "buttons on click" under the Bouncy/Spring easing. This is implemented as a hover-lift + active-press CSS transform transition (`hover:scale-[1.03] active:scale-95`) using the `--ease-bouncy` token directly — **not** the `bouncyPop` keyframe preset from `devfest-animation`, since a press is an ongoing interaction state, not a one-shot entrance. If you need an entrance animation for a button appearing on screen (e.g. a badge-reveal moment), wrap it in `bouncyPop` separately.

## Usage

```tsx
import { Button } from "@/components/ui/Button";

<Button tone="yellow" href="/tickets">Get Tickets</Button>
<Button tone="green" variant="secondary" href="/shop">Shop</Button>
<Button onClick={() => setOpen(true)}>Open</Button>
```

## Built on

`@/i18n/navigation`'s `Link` for internal navigation.
