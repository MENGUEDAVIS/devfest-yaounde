# IconWrapper

`src/components/ui/IconWrapper.tsx`

Wraps a Phosphor icon component with the `DESIGN.md` §3 sizing scale and weight vocabulary baked in as typed props, so nobody picks a freehand pixel size.

## Props

| Prop          | Type                                         | Default                        | Notes                                                                                                 |
| ------------- | -------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `icon`        | `Icon` (from `@phosphor-icons/react`)        | required                       | The icon component itself, e.g. `CalendarBlank`                                                       |
| `size`        | `16 \| 20 \| 24 \| 32 \| 48`                 | `24`                           | Matches `DESIGN.md` §3's scale exactly — no other sizes are on-brand                                  |
| `weight`      | `"regular" \| "bold" \| "duotone" \| "fill"` | `"regular"`                    | Regular = everyday UI, Bold = emphasis/active, Duotone = fun/illustrative, Fill = active/toggled only |
| `className`   | `string`                                     | —                              |                                                                                                       |
| `aria-label`  | `string`                                     | —                              | Set when the icon conveys meaning on its own (no adjacent text)                                       |
| `aria-hidden` | `boolean`                                    | `true` unless `aria-label` set |                                                                                                       |

## Usage

```tsx
import { CalendarBlank } from "@phosphor-icons/react";
import { IconWrapper } from "@/components/ui/IconWrapper";

<IconWrapper icon={CalendarBlank} size={20} weight="bold" />;
```

## Built on

Directly re-exports a Phosphor icon component — no other dependency.
