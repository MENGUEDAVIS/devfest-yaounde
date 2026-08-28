# DevFestLogo

`src/components/brand/DevFestLogo.tsx`

The DevFest "><" mark, inlined as SVG so its two bracket halves are real animatable elements. See `docs/decisions/0006-logo-assets.md` for where the asset came from and the open follow-up on chapter-specific artwork.

## Props

| Prop          | Type      | Default | Notes                                                                               |
| ------------- | --------- | ------- | ----------------------------------------------------------------------------------- |
| `className`   | `string`  | —       | Size it with `h-*`; width follows via `w-auto`                                      |
| `animateIn`   | `boolean` | `false` | Plays the split-and-snap entrance on mount                                          |
| `interactive` | `boolean` | `false` | Enables hover parting + the click-to-spin easter egg                                |
| `title`       | `string`  | —       | Accessible name. Omit for decorative instances — the SVG then renders `aria-hidden` |

## Why it's inlined rather than an `<img src="/logo/devfest-logo.svg">`

An SVG referenced through `<img>` is an opaque image — the host page can't reach its internals, so the bracket halves can't be animated separately. Inlining is what makes the split/snap/spin possible. The file still exists at `public/logo/devfest-logo.svg` as the source asset and at `src/app/icon.svg` as the favicon.

## The two-`<g>`-per-half structure

Each half is wrapped in **two** nested `<g>` elements:

- **outer** — owns the entrance animation and the easter-egg spin
- **inner** — owns the hover parting transition

They're separate on purpose. The entrance animation is `both`-filled, so it keeps applying its final `transform` after finishing; if the hover transition targeted the same element, the animation would permanently win and hover would do nothing.

`.logo-piece` sets `transform-box: fill-box`, without which SVG rotations pivot around the viewBox origin instead of the shape's own centre.

## Colors

The mark is legitimately four-colored — it's the inherited GDG brand mark. This does **not** breach the yellow-dominant rule (`DESIGN.md` §2.5), which governs page surfaces rather than the brand mark. Don't recolor it to fit the theme.

## Usage

```tsx
import { DevFestLogo } from "@/components/brand/DevFestLogo";

// Hero — full treatment
<DevFestLogo animateIn interactive title="DevFest" className="h-12 w-auto cursor-pointer" />

// Navbar / footer — static mark
<DevFestLogo className="h-6 w-auto" />
```

## Watch out

Adding this to the navbar widened the row enough to reintroduce the overlap bug. If you place it in the chrome again, re-run the breakpoint sweep (320→1920px) described in `docs/components/section-container.md`'s sibling note and `0006-logo-assets.md`.
