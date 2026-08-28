# MorphedImageFrame

`src/components/ui/MorphedImageFrame.tsx`

## ⚠️ Currently renders a PLAIN shape on purpose

`DESIGN.md` §4.2's signature shape is a photo masked into the union of two overlapping rounded rectangles. That morph was implemented wrong repeatedly (it came out as plain rectangles, or as circle-unions that didn't match the spec), so the design doc now carries an explicit **interim directive**: don't fake it.

This component therefore renders a **clean plain rounded rectangle (`radius-lg`) or circle**, with the image properly filling the frame. An honest plain shape is better than a broken signature shape. The project owner will supply real morphed assets later.

**Do not** re-attempt a hand-rolled morph, and **do not** scatter one-off image containers around the codebase. When the real assets arrive, the swap happens by editing the shape inside this one file — every call site keeps working untouched. That's the whole reason it stays a single component with this name.

## Props

| Prop          | Type                          | Default     | Notes                                                               |
| ------------- | ----------------------------- | ----------- | ------------------------------------------------------------------- |
| `src`         | `string`                      | required    |                                                                     |
| `alt`         | `string`                      | required    | Real accessibility text — these wrap real community photos          |
| `shape`       | `"rounded" \| "circle"`       | `"rounded"` | `rounded` = `radius-lg`; `circle` for avatars                       |
| `aspectRatio` | `string` (CSS `aspect-ratio`) | `"1/1"`     | e.g. `"4/3"` for a wider photo                                      |
| `className`   | `string`                      | —           | Callers commonly add `border-2 border-black02` and hover transforms |

## Usage

```tsx
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";

<MorphedImageFrame
  src={speaker.photoUrl}
  alt={speaker.name}
  className="border-2 border-black02"
/>;
```

## Where to use it / where not to

Per `DESIGN.md` §4.2: speaker photos, organizer/team photos, past-event galleries, optionally swag shots. **Never** for UI screenshots, diagrams, or anything informational.

## Built on

A plain `<div>` + `<img object-cover>`. It uses a raw `<img>` rather than `next/image` because sources come from content JSON (and later, arbitrary uploaded/CDN URLs); wiring `next/image` here is a separate decision, not something to slip in.
