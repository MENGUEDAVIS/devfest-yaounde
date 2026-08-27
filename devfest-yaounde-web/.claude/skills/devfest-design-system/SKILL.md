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
--font-sans: var(--font-google-sans), 'Google Sans', 'Product Sans', 'Inter', system-ui, sans-serif;
--font-mono: var(--font-google-sans-code), 'Google Sans Code', 'Roboto Mono', ui-monospace, monospace;
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

Never invent a hex value outside this list. No gradients that blend core colors into muddy in-betweens.

```js
colors: {
  blue:   { DEFAULT: '#4285F4', halftone: '#57CAFF', pastel: '#C3ECF6' },
  green:  { DEFAULT: '#34A853', halftone: '#5CDB6D', pastel: '#CCF6C5' },
  yellow: { DEFAULT: '#F9AB00', halftone: '#FFD427', pastel: '#FFE7A5' },
  red:    { DEFAULT: '#EA4335', halftone: '#FF7DAF', pastel: '#F8D8D8' },
  offwhite: '#F0F0F0', // primary light bg — not pure white
  black02:  '#1E1E1E', // primary text + dark bg — not pure black
}
```

Section → color mapping (fixed across years, never change this):

| Page | Primary | Accent |
|---|---|---|
| Event (Home/Schedule/Speakers/Team) | Blue 500 | Halftone Blue |
| Tickets | Yellow 600 | Halftone Yellow |
| Swag/Shop | Green 500 (in stock) / Red 500 (sold out) | Halftone Green |
| Community/Bevy | all four | — |

Accessibility (non-negotiable):
- 4.5:1 minimum contrast for body text. Yellow 600 and pastels usually need `black02` text, not white — check every time.
- Never place Red 500 text on Green 500 or vice versa.
- Every color-coded status (e.g. "Sold out") must also carry a text label or icon — color alone is never sufficient.

## Icons

Phosphor Icons **exclusively** — never mix in another icon set (no Material, FontAwesome, emoji-as-icon).

| Weight | Use |
|---|---|
| Regular | default UI: nav, forms, inline icons |
| Bold | emphasis, primary buttons, active states |
| Duotone | feature highlights, empty states, illustrative/fun moments (swag, easter eggs) |
| Fill | active/toggled state only (e.g. saved heart) |

Sizes: 16 / 20 / 24 / 32 / 48px+ (inline → hero). Icons inherit text color unless intentionally accented. Never skew/stretch — scale proportionally only. Regular weight = transactional (checkout, forms); duotone/fill = fun (swag, easter eggs).

## Imagery — Morphed Photo Frame (the signature shape)

The one visual signature of the brand: photos masked into a shape formed by the **union of two overlapping rounded rectangles**, rotated 15–35° apart from each other.

Build steps:
1. Two rounded rectangles, corner radius ≥ 24px each.
2. Rotate one relative to the other (e.g. 0° and 25°).
3. Boolean union of the two → one continuous irregular rounded blob outline.
4. Apply as SVG `clip-path` or CSS `mask` over the photo.
5. Vary rotation/proportions per instance (so repeated photos don't look copy-pasted) but keep the radius and two-rectangle-union logic consistent everywhere.

Use for: speaker photos, organizer/team photos, past-event galleries, optionally swag shots.
Never use for: UI screenshots, diagrams, anything informational — reserve it for people/moments only.

Photography: real community photos only, never stock. Light natural grading, no heavy filters, no crushed blacks/oversaturation.

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

This section is the *spec* — easing curves, durations, tiers. For actual reusable, named code presets built from this spec (e.g. `bouncyPop`, `fadeInUp`, `staggerReveal`, `marqueeLoop`) and the required `prefers-reduced-motion` wrapper, see the **`devfest-animation`** skill — extend that skill rather than hand-rolling a one-off animation that doesn't reuse its presets.

```css
--ease-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1); /* button press, add-to-cart, badge reveal, easter eggs */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);         /* scroll reveals, modal open, card hover-lift */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* tab switches, page transitions, theme shifts */
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
- **Ticket tier cards**: tier name in `mono-tag`, price in mono, Phosphor check icons for perks, border color = tier rank.
- **Swag cards**: morphed-frame or rounded-square photo, status pill always paired with text label (never color alone).
- **Badges/tags**: `radius-pill`, pastel bg + core color text, mono type.
- **Nav**: sticky, off-white/glass-blur bg, Blue 500 active underline.

## Governance

Do: use only the fonts/colors/icons listed above; round every corner; keep §2.5 mapping fixed across years; respect reduced-motion and contrast on every new component; log easter eggs.

Don't: stock photography for people; mix icon libraries; sharp corners; color-only status; more than one hero focal point per screen; autoplay sound; CMYK/Pantone values (print-only, out of scope here).
