# SectionContainer

`src/components/ui/SectionContainer.tsx`

Handles the `DESIGN.md` §7 background rhythm and the §7b spacing bar, so a page author picks a background _token_ instead of hand-coding section colors.

## Props

| Prop         | Type                                                   | Default            |
| ------------ | ------------------------------------------------------ | ------------------ |
| `background` | `"yellow-wash" \| "offwhite" \| "yellow" \| "black02"` | `"yellow-wash"`    |
| `maxWidth`   | `"3xl" \| "4xl" \| "5xl" \| "6xl" \| "7xl"`            | `"5xl"`            |
| `id`         | `string`                                               | — for anchor links |
| `className`  | `string`                                               | —                  |
| `children`   | `ReactNode`                                            | required           |

## The background set is deliberately small

There is no `pastel-blue` / `pastel-green` / `pastel-red` option, and that's the point. Per the base theme (`docs/decisions/0005-base-color-theme.md`) yellow leads everywhere; the rhythm down a long scroll is **Pastel Yellow → Off White → Pastel Yellow → Black02 dark band**. If a section feels like it needs its own color to stand out, the fix is layout/typography, not a new background token.

## Spacing

Vertical padding is `py-24 sm:py-32 lg:py-40` (96 → 160px), which is the §7b requirement — exaggerated type only reads as confident when it has room. Don't override this downward on a whim.

## Usage

```tsx
import { SectionContainer } from "@/components/ui/SectionContainer";

<SectionContainer background="yellow-wash" maxWidth="4xl">
  <h2 className="text-display-xl font-bold">...</h2>
</SectionContainer>;
```

**Implementation note:** `maxWidth` resolves through an internal lookup map to full literal Tailwind class strings (`max-w-4xl`, etc.) rather than template interpolation (`` `max-w-${maxWidth}` ``) — Tailwind's static scanner needs the complete class name in source or it silently emits no CSS. Follow the same pattern for any new variant prop on any component.

## Built on

Tailwind utility classes only.
