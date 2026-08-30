# ScrollStage

`src/components/ui/ScrollStage.tsx`

Scroll-position-linked choreography for a section — motion on the way **in** _and_ on the way **out**, unlike `Reveal` which fires once and stays. Currently used by Memory Lane (PHASE5 §5).

## Props

| Prop        | Type        | Default  |
| ----------- | ----------- | -------- |
| `children`  | `ReactNode` | required |
| `className` | `string`    | —        |

## What it writes onto its element

- **`--stage-progress`** — `0` when the section is about to enter from below, `1` once it has travelled fully past the top of the viewport. Descendants with `.stage-parallax` read this to drift at different depths.
- **`is-entering` / `is-leaving`** classes — descendants with `.stage-photo` use these to assemble on entry and disperse on exit.

Because both signals live on the container, the CSS hooks are descendant selectors (`.is-entering .stage-photo`), not compound ones.

## Companion classes and helpers

| Class / helper                      | Purpose                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `stagePhoto` (`.stage-photo`)       | Element that assembles/disperses. Resting state is dropped, over-rotated and slightly small |
| `stagePhotoStyle(index, rotateDeg)` | Sets the stagger index and the settled tilt for one photo                                   |
| `stageParallax` (`.stage-parallax`) | Element that drifts with scroll                                                             |
| `parallaxStyle(depthPx)`            | How far that element travels — vary it per item or the layers won't separate                |

Keep parallax and stage choreography on **different elements** (wrapper vs. inner). Both set `transform`, so putting them on one element means one silently overwrites the other.

## Performance

The scroll handler is `requestAnimationFrame`-throttled and writes straight to the DOM node — deliberately **not** React state. This fires on essentially every scroll frame; re-rendering a photo grid that often would be wasteful, and would also trip the `react-hooks/set-state-in-effect` rule this project's ESLint config enforces.

## Accessibility

Under `prefers-reduced-motion: reduce` the effect short-circuits entirely: the stage is pinned to its settled state, **no scroll listener is attached at all**, and the CSS additionally force-disables the transforms. Parallax is among the most motion-sickness-prone effects, so it gets belt-and-braces treatment rather than just a CSS override.

## Usage

```tsx
<ScrollStage>
  <div className={stageParallax} style={parallaxStyle(26)}>…heading…</div>
  {photos.map((p, i) => (
    <div key={p.id} className={stageParallax} style={parallaxStyle(DEPTHS[i])}>
      <div className={stagePhoto} style={stagePhotoStyle(i, ROTATIONS[i])}>
        <MorphedImageFrame … />
      </div>
    </div>
  ))}
</ScrollStage>
```
