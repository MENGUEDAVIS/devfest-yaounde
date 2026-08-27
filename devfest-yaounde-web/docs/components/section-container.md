# SectionContainer

`src/components/ui/SectionContainer.tsx`

Handles the `DESIGN.md` §7 alternating background rhythm (Off White → pastel wash → Off White → Black02 dark band) and consistent vertical/horizontal rhythm, so a page author picks a background token instead of hand-coding colors per section.

## Props

| Prop         | Type                                                                                            | Default                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `background` | `"offwhite" \| "pastel-blue" \| "pastel-green" \| "pastel-yellow" \| "pastel-red" \| "black02"` | `"offwhite"`                                                |
| `maxWidth`   | `"3xl" \| "4xl" \| "5xl" \| "6xl"`                                                              | `"5xl"` — narrower for text-heavy sections, wider for grids |
| `id`         | `string`                                                                                        | — for anchor links                                          |
| `className`  | `string`                                                                                        | —                                                           |
| `children`   | `ReactNode`                                                                                     | required                                                    |

## Usage

```tsx
import { SectionContainer } from "@/components/ui/SectionContainer";

<SectionContainer background="pastel-blue" maxWidth="4xl">
  <h2>...</h2>
</SectionContainer>;
```

**Implementation note:** `maxWidth` is resolved through an internal lookup map to full literal Tailwind class strings (`max-w-3xl`, etc.) rather than template-string interpolation (`` `max-w-${maxWidth}` ``) — Tailwind's static scanner needs the complete class name to appear literally in source, or it silently generates no CSS for it. Follow the same pattern for any new variant props on any component.

## Built on

Tailwind utility classes only.
