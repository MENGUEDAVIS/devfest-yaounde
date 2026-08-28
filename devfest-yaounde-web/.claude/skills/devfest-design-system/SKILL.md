---
name: devfest-design-system
description: Use when writing or editing any UI component, CSS/Tailwind config, or visual element for the DevFest Yaoundé site — colors, typography, icons, imagery/photo framing, corner radii, shapes, or motion/animation. Condensed, ready-to-apply rules from docs/design/DESIGN.md.
---

# DevFest Yaoundé Design System

Source of truth: `docs/design/DESIGN.md`. This skill condenses it into rules and config you can apply directly, without re-reading the full doc each time.

Three words every design decision must hold to: **Welcoming. Playful. Credible.**

## Typography

Fonts: `Google Sans` (display/headings, bold; body, regular), `Google Sans Code` (accents only — tags, prices, dates, badges, countdowns — never full paragraphs). Note the corrected name: DESIGN.md's brand-deck source calls the second family "Google Sans Mono," but its real Google Fonts family name is **Google Sans Code** — always use the Google Fonts name in code.

Both families are loaded for real via `next/font/google` in `src/app/[locale]/layout.tsx` (`Google_Sans` → `--font-google-sans`, `Google_Sans_Code` → `--font-google-sans-code`), confirmed present in this project's installed Next.js font manifest. The fallback stack below only engages if that load ever fails — see `docs/decisions/0004-font-loading.md`.

```css
--font-sans:
  var(--font-google-sans), "Google Sans", "Product Sans", "Inter", system-ui,
  sans-serif;
--font-mono:
  var(--font-google-sans-code), "Google Sans Code", "Roboto Mono", ui-monospace,
  monospace;
```

Type scale (Tailwind `fontSize` extension):

```js
fontSize: {
  'display-xl': ['72px', { lineHeight: '1.05', fontWeight: '700' }], // hero headline, one per page max
  'display-l':  ['48px', { lineHeight: '1.1',  fontWeight: '700' }], // section titles
  'heading-l':  ['32px', { lineHeight: '1.2',  fontWeight: '700' }], // sub-section headers, card titles
  'heading-m':  ['24px', { lineHeight: '1.3' }],                     // speaker/product names
  'body-l':     ['18px', { lineHeight: '1.6' }],                     // lead paragraphs
  'body-m':     ['16px', { lineHeight: '1.6' }],                     // default body — never smaller
  'caption':    ['14px', { lineHeight: '1.4' }],                     // metadata, mono
  'mono-tag':   ['13px', { lineHeight: '1.2', letterSpacing: '0.04em' }], // uppercase, bold mono — ticket names, badges, prices
}
```

Rules:

- Never mix Bold and Regular within one sentence — vary across lines/blocks instead.
- Minimum body text: 16px, always.
- Google Sans Code is seasoning, not a meal.

## Color

Never invent a hex value outside this list.

```js
colors: {
  yellow: { DEFAULT: '#F9AB00', halftone: '#FFD427', pastel: '#FFE7A5' }, // DOMINANT
  blue:   { DEFAULT: '#4285F4', halftone: '#57CAFF', pastel: '#C3ECF6' }, // accent only
  green:  { DEFAULT: '#34A853', halftone: '#5CDB6D', pastel: '#CCF6C5' }, // accent only
  red:    { DEFAULT: '#EA4335', halftone: '#FF7DAF', pastel: '#F8D8D8' }, // accent only
  offwhite: '#F0F0F0', // secondary light bg — not pure white
  black02:  '#1E1E1E', // primary text + dark bg — not pure black
}
```

### THE BASE THEME RULE (DESIGN.md §2.5) — read before picking any color

**The site is not a rainbow. Yellow leads everywhere.**

- **Dominant (~70% of colored surface):** Pastel Yellow `#FFE7A5` is the default page/section wash — this is the page ground, NOT off-white. Yellow 600 `#F9AB00` for primary emphasis (key CTAs, active states). Halftone Yellow `#FFD427` for accents and hover.
- **Supporting (~30%, semantic jobs only):** Blue → links / occasional secondary CTA. Green → success, "in stock". Red → urgency/sold-out/errors ONLY, and it should feel rare.
- **A section should almost never show all four core colors at once.** If it does, pull it back to yellow-dominant plus at most one accent.
- **Never give a page its own core color.** The old per-section mapping (Event=Blue, Tickets=Yellow, Shop=Green) is **RETIRED** — see `docs/decisions/0005-base-color-theme.md`. Reintroducing it is a regression, not a refresh.

Section rhythm down a long scroll: Pastel Yellow → Off White → Pastel Yellow → Black02 dark band. Use `SectionContainer`'s `background` prop (`yellow-wash` | `offwhite` | `yellow` | `black02`) rather than hand-coding section colors.

### GRADIENTS ARE BANNED (DESIGN.md §2.6)

**No gradients. Anywhere. Zero exceptions.** No `bg-gradient-*`, no `linear-gradient`/`radial-gradient` in CSS or inline styles, no `<linearGradient>`/`<radialGradient>` in SVG assets. Every colored surface is a flat solid fill.

If something feels like it needs a gradient for depth: layer a flat shape over another flat shape, or use a flat offset shadow (`shadow-[0_4px_0_0_var(--color-black02)]`). A `grep -ri gradient src/ public/` must come back empty.

### Themed chrome (already wired in `globals.css` — keep it)

Yellow-family scrollbar, `::selection`, and focus ring. Don't override these per-component.

Accessibility (non-negotiable):

- 4.5:1 minimum contrast for body text. Yellow 600 and pastels usually need `black02` text, not white — check every time.
- Never place Red 500 text on Green 500 or vice versa.
- Every color-coded status (e.g. "Sold out") must also carry a text label or icon — color alone is never sufficient.

## Icons

Phosphor Icons **exclusively** — never mix in another icon set (no Material, FontAwesome, emoji-as-icon).

| Weight  | Use                                                                            |
| ------- | ------------------------------------------------------------------------------ |
| Regular | default UI: nav, forms, inline icons                                           |
| Bold    | emphasis, primary buttons, active states                                       |
| Duotone | feature highlights, empty states, illustrative/fun moments (swag, easter eggs) |
| Fill    | active/toggled state only (e.g. saved heart)                                   |

Sizes: 16 / 20 / 24 / 32 / 48px+ (inline → hero). Icons inherit text color unless intentionally accented. Never skew/stretch — scale proportionally only. Regular weight = transactional (checkout, forms); duotone/fill = fun (swag, easter eggs).

## Imagery — MorphedImageFrame

The brand's eventual signature is a photo masked into the union of two overlapping rounded rectangles (15–35° apart).

> **INTERIM DIRECTIVE — DO NOT FAKE THE MORPH (DESIGN.md §4.2).** This shape has been implemented wrong repeatedly. Until the human supplies real morphed assets, `MorphedImageFrame` deliberately renders a **clean plain shape** — a rounded rect (`radius-lg`) or a circle — with the image filling it. An honest plain shape beats a broken signature shape. Do not re-attempt a hand-rolled union, and do not create one-off image containers elsewhere; the swap point stays inside that single component.

Use for: speaker photos, organizer/team photos, past-event galleries, optionally swag shots.
Never use for: UI screenshots, diagrams, anything informational — reserve it for people/moments only.

Photography: real community photos only, never stock. Light natural grading, no heavy filters, no crushed blacks/oversaturation.

## Boldness bar (DESIGN.md §7b) — enforceable, not suggestions

Past builds shipped looking like a default Next.js starter. That's a brand failure, not a neutral default. Reference `design.google` / `m3.material.io`.

- **Hero headline:** `text-display-hero` (clamps 56→120px). `display-xl` (72px) is a FLOOR on desktop, not a ceiling.
- **Buttons:** chunky — the `Button` component's `size="lg"` (px-9 py-4, 18px bold label) is the default for CTAs. A primary CTA must never look like a default HTML button.
- **Shapes:** oversized and FEW. One 300–600px flat shape beats five small ones. Flat fills only.
- **Spacing:** section vertical padding 96–160px desktop — `SectionContainer` already does this. Big + cramped = messy; big + spacious = bold.
- **Weight contrast:** very bold display headings against calm, lighter body text (e.g. `text-black02` heading over `text-black02/80` body).
- **The test:** screenshot a section. If it could pass for an unstyled Bootstrap/Tailwind-default page, it fails.

Balance clause: exaggeration applies to hero/focal moments, not everything at once. Pattern = big bold star element → calm supporting space → next star element.

## Chrome (DESIGN.md §7c)

Banner + navbar are **ONE connected unit** — same width, same alignment, banner attached to the nav's top (Claude.ai credit-notice model), never two mismatched floating bars. Implemented in `GlobalChrome.tsx`; the banner collapses via `grid-template-rows: 1fr → 0fr` and the unit morphs `rounded-lg → rounded-pill` as the nav reclaims the space.

**No overlapping nav content at any breakpoint — that's a correctness bug, not a polish item.** The full desktop row doesn't fit under 1024px, so the hamburger persists until `lg`. Re-test across widths after any nav change.

## Shapes & Corner Radius

**No sharp (0px) corners anywhere. Ever.** This is non-negotiable.

```js
borderRadius: {
  sm: '8px',    // tags, small buttons, inputs
  md: '16px',   // cards, standard buttons
  lg: '24px',   // large cards, modals, photo frame base shapes
  pill: '999px' // pills, badges, ticket-tier chips, nav toggle
}
```

Primitives: circles (avatars, bullets, loading states), rounded rects (cards/buttons/containers), blobs (via §Imagery technique, or simplified — hero backgrounds, dividers, decorative confetti).

Decorative shapes: low-opacity/pastel when behind text (seasoning, not the main character) — except in hero moments where a shape IS the main character. Max one "hero" focal element per screen.

## Motion

This section is the _spec_ — easing curves, durations, tiers. For actual reusable, named code presets built from this spec (e.g. `bouncyPop`, `fadeInUp`, `staggerReveal`, `marqueeLoop`) and the required `prefers-reduced-motion` wrapper, see the **`devfest-animation`** skill — extend that skill rather than hand-rolling a one-off animation that doesn't reuse its presets.

```css
--ease-bouncy: cubic-bezier(
  0.34,
  1.56,
  0.64,
  1
); /* button press, add-to-cart, badge reveal, easter eggs */
--ease-out: cubic-bezier(
  0.16,
  1,
  0.3,
  1
); /* scroll reveals, modal open, card hover-lift */
--ease-in-out: cubic-bezier(
  0.65,
  0,
  0.35,
  1
); /* tab switches, page transitions, theme shifts */
/* linear for: marquees, rotating decorative shapes, progress bars, countdown ticks */
```

Durations: Micro 100–250ms (hover/press, icon state, focus rings). Meso 250–600ms (card lift, modal open, tab swap, mask reveal). Macro 600ms–1.2s (hero load sequence, staggered scroll-reveals, celebration animations).

Accessibility (non-negotiable):

- Respect `prefers-reduced-motion` — swap bouncy/macro animation for simple fades or instant states.
- No task or information may require motion to complete/access (checkout must work with animations off).
- No flashing faster than 3×/second.

Easter eggs: log every one added in `/EASTER-EGGS.md` at the project root so future organizers don't collide with or overwrite past ones (see `DESIGN.md` §6.3 for seed ideas).

## Layout

- Bold in the hero (big type, full-bleed color, oversized shapes), quiet after (whitespace, restrained pastel/off-white).
- Alternate section backgrounds down a long scroll (Off White → pastel wash → Off White → Black 02 dark band) without breaking the §2.5 color-to-section mapping.
- 12-column grid, gutters 24–32px desktop / 16px mobile.
- One bold focal element per section — never compete for attention within one screen.

## Component quick reference

- **Buttons**: `radius-pill` or `radius-md`, Google Sans Bold label, bouncy press animation, primary = core color fill, secondary = outline/pastel fill.
- **Ticket tier cards**: tier name in `mono-tag`, price in mono, Phosphor check icons for perks, border weight/color signals tier rank (flat fills only).
- **Swag cards**: plain rounded photo frame (see interim directive above), status pill always paired with text label (never color alone).
- **Badges/tags**: `radius-pill`, pastel bg + core color text, mono type.
- **Nav**: connected banner+nav unit, yellow-family themed, Yellow 600 active state.

Reuse the existing primitives rather than rebuilding: `Button`, `Badge`, `SectionContainer`, `IconWrapper`, `StatCounter`, `Modal`, `Reveal`, `MorphedImageFrame` — all documented in `docs/components/`.

## Governance

Do: use only the fonts/colors/icons listed above; **keep yellow dominant on every page and year (§2.5)**; round every corner; clear the §7b boldness bar; respect reduced-motion and contrast on every new component; log easter eggs.

Don't: **use a gradient of any kind (§2.6)**; **lead with a non-yellow color or give a page its own core color (§2.5, retired)**; **fake the morphed shape (§4.2 interim directive)**; ship a nav/banner that overlaps or reads as two mismatched bars (§7c); ship timid default-looking heroes/buttons/shapes (§7b); stock photography for people; mix icon libraries; sharp corners; color-only status; more than one hero focal point per screen; autoplay sound; CMYK/Pantone values.
