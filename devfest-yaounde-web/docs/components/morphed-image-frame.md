# MorphedImageFrame

`src/components/ui/MorphedImageFrame.tsx`

The brand's signature shape (`DESIGN.md` §4.2): a photo masked into the union of two overlapping rounded rectangles, rotated 15–35° apart.

## How it works

Built as an inline SVG `<mask>` containing two white rounded `<rect>` elements (one at 0°, one rotated). Overlapping white shapes drawn into one SVG mask naturally union — any pixel covered by _either_ rect is visible — so no boolean-geometry library is needed to get the "two rectangles had a friendly collision" outline from `DESIGN.md`.

## Props

| Prop          | Type                                | Default  | Notes                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src`         | `string`                            | required |                                                                                                                                                                                                                                              |
| `alt`         | `string`                            | required | Real accessibility text — these wrap real community photos                                                                                                                                                                                   |
| `rotation`    | `number`                            | auto     | Degrees between the two rects (15–35 per spec). Omit to derive a stable value from `src`+`alt` via a seeded hash — **not** `Math.random()`, which would both violate React's render-purity rule and cause a server/client hydration mismatch |
| `aspectRatio` | `string` (CSS `aspect-ratio` value) | `"1/1"`  | e.g. `"4/3"` for a wider photo                                                                                                                                                                                                               |
| `className`   | `string`                            | —        |                                                                                                                                                                                                                                              |

## Usage

```tsx
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";

<MorphedImageFrame
  src={speaker.photoUrl}
  alt={speaker.name}
  className="w-40"
/>;
```

## Where to use it / where not to

Per `DESIGN.md` §4.2: speaker photos, organizer/team photos, past-event galleries, optionally swag shots. **Never** for UI screenshots, diagrams, or anything informational.

## Built on

Plain inline SVG — no image-processing library, no next/image (SVG `<image>` doesn't compose with next/image's optimizer, so this renders the source directly; swap in a CDN-optimized URL upstream if that's ever needed).
