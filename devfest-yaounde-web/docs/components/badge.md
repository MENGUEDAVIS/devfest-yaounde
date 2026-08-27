# Badge

`src/components/ui/Badge.tsx`

Pill-radius, pastel-background + core-color-text tag, in Mono type. `DESIGN.md` §5.2/§8's shared primitive — this is what ticket tier chips and shop status pills will be built from later (Phase 5+), not a Home-only one-off.

## Props

| Prop        | Type                                     | Default  |
| ----------- | ---------------------------------------- | -------- |
| `tone`      | `"blue" \| "green" \| "yellow" \| "red"` | `"blue"` |
| `children`  | `ReactNode`                              | required |
| `className` | `string`                                 | —        |

Yellow uses `black02` text even though other tones use their own color — `DESIGN.md` §2.6 flags yellow/pastel combos as needing dark text for contrast.

## Usage

```tsx
import { Badge } from "@/components/ui/Badge";

<Badge tone="green">In Stock</Badge>;
```

Per `DESIGN.md` §2.6, a color-coded status must always carry a text label too — never rely on the badge's color alone to convey meaning (e.g. don't ship an empty colored dot).

## Built on

Tailwind utility classes only, no other component dependency.
