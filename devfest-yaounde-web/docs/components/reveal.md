# Reveal

`src/components/ui/Reveal.tsx`

Scroll-triggered entrance animation. Wraps content so it fades and rises into place as it enters the viewport (`DESIGN.md` §6.2 macro tier, §7c perceptibility requirement).

## Props

| Prop        | Type          | Default  | Notes                                                                  |
| ----------- | ------------- | -------- | ---------------------------------------------------------------------- |
| `children`  | `ReactNode`   | required |                                                                        |
| `index`     | `number`      | `0`      | Stagger position within a group — each step adds 110ms                 |
| `as`        | `ElementType` | `"div"`  | Render as `li`, `section`, etc. where the wrapper div would be invalid |
| `className` | `string`      | —        |                                                                        |

## Usage

```tsx
import { Reveal } from "@/components/ui/Reveal";

<Reveal>
  <h2>Section title</h2>
</Reveal>;

{
  items.map((item, i) => (
    <Reveal key={item.id} index={i}>
      <Card {...item} />
    </Reveal>
  ));
}
```

## How it works, and why it's not React state

An `IntersectionObserver` adds the `is-visible` class **directly on the DOM node**, which drives the `.anim-reveal` transition in `motion.css`. It deliberately does not go through React state: dozens of these can be on one page, and a state update per element per scroll would put avoidable churn in the render path. The observer unobserves each element once it has fired — reveals are one-way, they don't re-hide on scroll-up.

## Accessibility

Under `prefers-reduced-motion: reduce`, `motion.css` forces `.anim-reveal` to `opacity: 1` with no transform or transition, so content is fully visible regardless of whether the observer ever fires. There's also a fallback in the effect: if `IntersectionObserver` is unavailable, the class is added immediately rather than leaving content stuck invisible.

This matters — a scroll-reveal that starts at `opacity: 0` is a content-hiding mechanism, so its failure mode has to be "show everything," never "hide everything."

## Built on

Native `IntersectionObserver` + CSS transitions. No animation library.
