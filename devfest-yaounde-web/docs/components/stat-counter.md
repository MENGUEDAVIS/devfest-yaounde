# StatCounter

`src/components/ui/StatCounter.tsx`

Animated count-up stat (`DESIGN.md` §6.2 macro tier), triggered when it scrolls into view.

## Props

| Prop         | Type     | Default                                |
| ------------ | -------- | -------------------------------------- |
| `value`      | `number` | required — final number to count up to |
| `label`      | `string` | required — e.g. `"developers"`         |
| `suffix`     | `string` | `""` — e.g. `"+"` for "500+"           |
| `durationMs` | `number` | `1200` (macro tier, `DESIGN.md` §6.2)  |
| `className`  | `string` | —                                      |

## Motion & accessibility

Uses a native `IntersectionObserver` (no library) to start counting once the element is ~40% visible, then a `requestAnimationFrame` loop with ease-out easing. Respects `prefers-reduced-motion` (`DESIGN.md` §6.5) by checking `window.matchMedia` and jumping straight to the final value instead of counting, the first time it becomes visible.

## Usage

```tsx
import { StatCounter } from "@/components/ui/StatCounter";

<StatCounter value={500} suffix="+" label="developers" />;
```

## Built on

Native `IntersectionObserver` + `requestAnimationFrame` — no animation library.
