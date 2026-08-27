# DevFest Yaoundé — Design System

### A living template for every DevFest Yaoundé, year after year

---

## 0. Purpose & Philosophy

This document is the single source of truth for how DevFest Yaoundé looks, moves, and feels — on the website, and eventually anywhere else the brand shows up. It exists so that:

- Every year's site feels unmistakably **DevFest Yaoundé**, even as content, speakers, and themes change.
- New organizers can build or update the site without guessing what's "on brand."
- We inherit Google's GDG/DevFest brand system (typography, core colors) but layer our **own personality** on top: warm, playful, community-first, unapologetically tech-hyped.

**The vibe in one sentence:** _A developer meetup thrown by friends who happen to be really, really good at building things — bold like Google, warm like home._

Three words to hold onto for every decision in this doc: **Welcoming. Playful. Credible.** If a design choice sacrifices any one of these, reconsider it.

---

## 1. Typography

### 1.1 Typefaces

| Role                               | Typeface                  | Why                                                                                                                                                |
| ---------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display / Headings                 | **Google Sans** (Bold)    | Inherited from GDG brand system. Confident, geometric, friendly rounded terminals — carries the "big bold Google energy."                          |
| Body copy                          | **Google Sans** (Regular) | Keeps the whole page in one family so nothing feels bolted-on.                                                                                     |
| Accents, labels, data, code-flavor | **Google Sans Code**      | Reserved for short bursts: ticket tier names, prices, dates, tags, countdown timers, badge text. This is what gives the site its "developer" wink. |

> **Naming correction (2026-08-27):** the GDG/DevFest brand decks refer to this second typeface as "Google Sans Mono." On Google Fonts, both families are published under different names — the display family is listed as **Google Sans**, and its monospace companion is listed as **Google Sans Code**, not "Google Sans Mono." Use the Google Fonts names in code (font-family declarations, `next/font` imports); "Google Sans Mono" only appears in Google's own brand documentation, not the actual font catalog.
>
> Both families are confirmed available on Google Fonts as of this correction — load them for real via `next/font/google` where the installed toolchain's font manifest supports them, or self-host via `next/font/local` (downloading the files from the Google Fonts specimen pages, license permitting) as a fallback. This replaces the earlier fallback-stack-only approach.
>
> Fallback stack (only engages if the real fonts fail to load for any reason): `'Google Sans', 'Product Sans', 'Inter', system-ui, sans-serif`
> Mono fallback: `'Google Sans Code', 'Roboto Mono', ui-monospace, monospace`

### 1.2 Type Scale (web reference)

| Token        | Size / Line-height                           | Weight           | Usage                                            |
| ------------ | -------------------------------------------- | ---------------- | ------------------------------------------------ |
| `display-xl` | 72px / 1.05                                  | Bold             | Hero headline only. One per page, max.           |
| `display-l`  | 48px / 1.1                                   | Bold             | Section titles ("The Event", "Tickets", "Swag"). |
| `heading-l`  | 32px / 1.2                                   | Bold             | Sub-section headers, card titles.                |
| `heading-m`  | 24px / 1.3                                   | Bold/Regular mix | Speaker names, product names.                    |
| `body-l`     | 18px / 1.6                                   | Regular          | Lead paragraphs, intros.                         |
| `body-m`     | 16px / 1.6                                   | Regular          | Default body text.                               |
| `caption`    | 14px / 1.4                                   | Regular (Mono)   | Metadata: dates, timestamps, fine print.         |
| `mono-tag`   | 13px / 1.2, uppercase, letter-spacing 0.04em | Bold (Mono)      | Ticket names, badges, price tags.                |

**Rules:**

- Never mix Bold and Regular _within the same sentence_ — mix them across lines/blocks instead (e.g., a Bold word on one line, Regular sentence below), matching the GDG guide's own instruction.
- Google Sans Code is a seasoning, not a meal — never set full paragraphs in it.
- Minimum body text size: 16px. This is a community site for everyone, including on old phones and small screens.

---

## 2. Color System

All colors are sourced directly from the GDG/DevFest brand decks. **CMYK/Pantone values are excluded** — this is a digital-first system; print exceptions can reference the original decks if ever needed.

### 2.1 Core Palette

| Name       | Hex       | Role                                                            |
| ---------- | --------- | --------------------------------------------------------------- |
| Blue 500   | `#4285F4` | Primary brand color — links, primary CTAs, "Event" section      |
| Green 500  | `#34A853` | Success states, confirmations, "Swag/Shop" availability         |
| Yellow 600 | `#F9AB00` | Energy accent, "Tickets" section, highlights, hover glows       |
| Red 500    | `#EA4335` | Urgency, "sold out"/"closing soon" states, sparingly for alerts |

### 2.2 Halftones (brighter, more saturated — for digital energy)

| Name            | Hex       |
| --------------- | --------- |
| Halftone Blue   | `#57CAFF` |
| Halftone Green  | `#5CDB6D` |
| Halftone Yellow | `#FFD427` |
| Halftone Red    | `#FF7DAF` |

Use for: gradients, glow/blur effects behind shapes, hover states, decorative confetti/blob shapes, dark-mode accent boosts.

### 2.3 Pastels (soft — for backgrounds and calm surfaces)

| Name          | Hex       |
| ------------- | --------- |
| Pastel Blue   | `#C3ECF6` |
| Pastel Green  | `#CCF6C5` |
| Pastel Yellow | `#FFE7A5` |
| Pastel Red    | `#F8D8D8` |

Use for: section background washes, card backgrounds, tags/pills, empty states — anywhere a full saturated color would be too loud.

### 2.4 Grayscale

| Name      | Hex       | Usage                                                        |
| --------- | --------- | ------------------------------------------------------------ |
| Off White | `#F0F0F0` | Primary light background (not pure white — softer, warmer)   |
| Black 02  | `#1E1E1E` | Primary text color and dark-mode background (not pure black) |

### 2.5 Color-to-Section Mapping (consistency across years)

To keep the three priority pages instantly recognizable and to make the site easy to navigate by color memory alone:

| Page                 | Primary Color                                     | Accent                           |
| -------------------- | ------------------------------------------------- | -------------------------------- |
| **Event**            | Blue 500                                          | Halftone Blue                    |
| **Tickets**          | Yellow 600                                        | Halftone Yellow                  |
| **Swag / Shop**      | Green 500 (in stock) + Red 500 (sold out/urgency) | Halftone Green                   |
| **Community / Bevy** | Full rainbow mix (all four)                       | — represents the whole community |

Each year's edition may shift _which pastel/halftone shade leads decoratively_ for freshness, but the **section-to-core-color mapping stays fixed** — that consistency is what makes this a template, not a one-off.

### 2.6 Accessibility Rules

- Body text must maintain **4.5:1 contrast minimum** against its background (verify Yellow 600 and pastels against text color — they often need Black 02 text, not white).
- Never place Red 500 text on Green 500 or vice versa (color-blind safety).
- Every color-coded status (e.g., "Sold out") must also carry a text label or icon — never color alone.

---

## 3. Iconography

**Icon set: [Phosphor Icons](https://phosphoricons.com/)** — exclusively. Never mix in other icon libraries (Material, FontAwesome, emoji-as-icon, etc.) — consistency of stroke weight is what makes an icon set feel intentional.

| Weight    | When to use                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| `Regular` | Default, everyday UI (nav, form fields, small inline icons)                                                           |
| `Bold`    | Emphasis, primary buttons, active/selected states                                                                     |
| `Duotone` | Feature highlights, empty states, illustrative moments (pairs beautifully with the two-tone pastel/core color system) |
| `Fill`    | Active/toggled states only (e.g., a filled heart once "saved")                                                        |

**Sizing scale:** 16px (inline text), 20px (buttons/forms), 24px (default UI), 32px (feature callouts), 48px+ (hero/illustrative use).

**Rules:**

- Icons inherit text color by default; only break this for intentional accent moments.
- Never stretch or skew an icon — scale proportionally only.
- Pick the _filled/duotone_ weight for anything meant to feel "fun" (swag page, easter eggs) and _regular_ weight for anything transactional (checkout, forms) — weight communicates seriousness.

---

## 4. Imagery

### 4.1 Photography

- **Real community photos only** for people, crowds, speakers, past events. No stock photography of generic "diverse people looking at laptop" — it undermines the "friends who build things" feeling.
- Light, natural color grading — avoid heavy filters. Slight warmth boost is fine; avoid crushing blacks or over-saturating (that's what the brand shapes/colors are for).

### 4.2 Signature Shape: Morphed Photo Frames

Our visual signature — the one thing that should make a screenshot instantly recognizable as _DevFest Yaoundé_ — is **photos masked inside a morphed shape formed from the union of two overlapping rounded rectangles**, rotated at different angles (roughly 15–35° offset from each other). Think of it as a soft, organic blob silhouette that still reads as "two rectangles had a friendly collision."

**How to build it:**

1. Take two rounded rectangles (corner radius ≥ 24px, never sharp).
2. Rotate one relative to the other (e.g., 0° and 25°).
3. Take the **union** (boolean add) of the two shapes — this produces one continuous, slightly irregular, fully-rounded blob outline.
4. Use that outline as a `clip-path` (SVG) or CSS `mask` over the photograph.
5. Vary rotation angle and rectangle proportions per instance so photos across the page don't feel copy-pasted — but keep corner radius and the "two-rectangle union" logic consistent everywhere.

**Where to use it:** speaker photos, organizer/team photos, past-event galleries, swag product shots (optional — product shots can also sit in plain rounded containers, see §5).

**Where NOT to use it:** never on UI screenshots, diagrams, or anything informational — reserve the morphed frame for _people and moments_, so it keeps its meaning.

---

## 5. Shapes

Inspired directly by how Google treats shape in Gemini and DevFest key art: **simple geometric primitives, deployed boldly, always rounded.**

### 5.1 Primitives

- **Circles** — for avatars, bullet markers, decorative floating accents, loading states.
- **Rounded rectangles / squares** — for cards, buttons, containers, badges.
- **Rounded polygons / blobs** (via the two-rectangle union technique in §4.2, or simplified single blobs) — for hero backgrounds, section dividers, decorative "confetti" scattered across the page.

### 5.2 Corner Radius Tokens

| Token         | Value | Usage                                        |
| ------------- | ----- | -------------------------------------------- |
| `radius-sm`   | 8px   | Tags, small buttons, input fields            |
| `radius-md`   | 16px  | Cards, standard buttons                      |
| `radius-lg`   | 24px  | Large cards, modals, photo frame base shapes |
| `radius-pill` | 999px | Pills, badges, ticket-tier chips, nav toggle |

**Absolute rule: no sharp (0px) corners anywhere on the site.** Not on cards, not on input borders, not on dividers. If something looks like it needs a hard edge, round it — that's non-negotiable brand DNA here.

### 5.3 Decorative Shape Usage

- Scatter small circles/blobs in halftone colors as ambient background texture — behind hero sections, between content sections as "breathing room" decoration.
- Large single blob shapes work well as full-bleed section background dividers (like Google's Gemini gradients, but with our flat/halftone palette instead of gradient mesh, to stay true to brand color rules).
- Keep decorative shapes **low-opacity or pastel-toned** when they sit behind text — they're seasoning, not the main character, except in hero moments where they _are_ the main character.

---

## 6. Motion & Animation

This is where the site earns its "hype" — but every animation should feel _purposeful_, not chaotic. Different elements get different motion personalities:

### 6.1 Easing Vocabulary

| Easing              | Curve (approx.)                                                                  | Use for                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Bouncy / Spring** | spring(mass:1, stiffness:300, damping:20) or `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful UI: buttons on click, swag "add to cart," badge reveals, mascot/blob shapes, easter egg pop-ins      |
| **Ease-out**        | `cubic-bezier(0.16, 1, 0.3, 1)`                                                  | Content entering the screen: scroll reveals, modal open, card hover-lift                                     |
| **Ease-in-out**     | `cubic-bezier(0.65, 0, 0.35, 1)`                                                 | Transitions between states: tab switches, page transitions, color theme shifts                               |
| **Linear**          | `linear`                                                                         | Continuous/looping motion: marquee sponsor logos, rotating decorative shapes, progress bars, countdown ticks |

> **Implementation note:** this vocabulary (easing curves, durations, tiers) is the spec — the `devfest-animation` project skill is where it gets turned into reusable, named code primitives (e.g. shared spring/transition presets) so every component pulls from the same set instead of hand-rolling similar-but-slightly-different animations. If you're implementing motion and that skill doesn't cover the case you're building, extend the skill rather than freehanding it once and moving on.

### 6.2 Motion Tiers

- **Micro** (100–250ms): button hover/press, icon state changes, input focus rings, link underline draw-ins.
- **Meso** (250–600ms): card hover lift + shadow, modal/drawer open, tab content swap, image mask reveal.
- **Macro** (600ms–1.2s): page-load hero sequence, section scroll-reveals (staggered children), ticket-tier "upgrade" celebration animation.

### 6.3 Easter Eggs

Hide small delightful surprises around the site — rewarding curious visitors, which fits a developer-community audience perfectly. Examples to seed the concept (not exhaustive — this list should grow year to year):

- A hidden Konami-code-style input that triggers a confetti burst in halftone colors.
- Clicking the community/mascot shape a certain number of times unlocks a fun animation or a hidden message from the organizers.
- Hovering long enough over a "quiet" corner of a section reveals a tucked-away blob/critter animation.
- A subtle animated trail cursor effect that only appears on the Swag page (as if bragging about merch).

Document every easter egg added each year in a `/EASTER-EGGS.md` changelog so future organizers know what's already "claimed" and can keep adding new ones without collisions.

### 6.4 Sound (future phase)

Flagged for later, not this release: short, optional UI sound effects (button clicks, checkout success chime, easter-egg discovery jingle). When implemented:

- **Muted by default**, with an explicit opt-in toggle (never autoplay sound).
- Keep sounds under 300ms, soft/synthy, matching the "playful but credible" tone — not arcade-loud.

### 6.5 Accessibility (non-negotiable)

- Respect `prefers-reduced-motion`: swap bouncy/macro animations for simple fades or instant states.
- No motion should be required to access information or complete a task (e.g., checkout must work with animations off).
- Avoid flashing effects faster than 3 times per second (seizure safety).

---

## 7. Layout Principles

- **Go bold, then get quiet.** Hero sections can use `display-xl` type, full-bleed color blocks, and oversized shapes — Google-style confidence. Once past the hero, let content breathe with generous whitespace and restrained color (mostly Off White / pastels).
- **Section rhythm:** alternate background treatments (Off White → pastel wash → Off White → Black 02 dark band) so the long single-page scroll (Home) doesn't feel monotonous, while still respecting the color-to-section mapping in §2.5.
- **Grid:** 12-column responsive grid, generous gutters (24–32px desktop, 16px mobile). Cards and shapes should feel like they're arranged with intention, not just stacked.
- **One bold move per screen.** Per section, pick a single "hero" element (a big headline, a big shape, a big number) and keep everything else supporting it — avoid competing focal points.

---

## 8. Component Patterns (quick reference)

| Component              | Notes                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Buttons**            | `radius-pill` or `radius-md`, Google Sans Bold label, bouncy press animation, primary = core color fill, secondary = outline/pastel fill                                                           |
| **Ticket tier cards**  | Tier name in `mono-tag` style (e.g., "HAIKYU", "SONNET"), price in Google Sans Code, perks list with Phosphor check icons, card border color matches tier rank (free → paid gradient of intensity) |
| **Swag product cards** | Morphed-frame or rounded-square product photo, status pill (`In Stock` green / `Pre-order` yellow / `Sold Out` red, always with text label)                                                        |
| **Badges/tags**        | `radius-pill`, pastel background + core color text, Mono type                                                                                                                                      |
| **Nav**                | Sticky, Off White or blurred-glass background, Blue 500 active state underline                                                                                                                     |

---

## 9. Governance — Rules & Regulations

### Do

- Do use Google Sans + Google Sans Code exclusively.
- Do use only the hex values listed in §2 — no invented brand colors, no gradients that blend core colors into muddy in-between hues.
- Do use Phosphor Icons exclusively, matching weight to context.
- Do round every corner.
- Do keep the section-to-color mapping (§2.5) fixed across years.
- Do respect `prefers-reduced-motion` and color-contrast minimums on every new component.
- Do log new easter eggs so they don't get overwritten or duplicated next year.

### Don't

- Don't use stock photography for people/community imagery.
- Don't mix icon libraries.
- Don't introduce sharp (0px) corners anywhere.
- Don't rely on color alone to convey status or meaning.
- Don't overload a single screen with more than one "hero" focal moment.
- Don't autoplay sound, ever, without explicit opt-in.
- Don't use CMYK/Pantone values in any digital asset — those exist only for print, sourced separately from the original brand decks if needed.

### Extending this system for future editions

Each new year's team may:

- Introduce **one fresh accent treatment** (e.g., a new pattern of decorative blobs, a new easter egg set, a seasonal illustration style) — as long as it sits _on top of_ this system, not instead of it.
- Propose changes to this document itself if something genuinely isn't working — but changes should be discussed and merged deliberately, not silently drifted into, so the brand stays recognizable edition after edition.
- Reuse this file as the design contract when briefing any new designer or developer joining the project.

---

_This document is a living reference. Update it in the same repo as the website, and treat pull requests against `DESIGN.md` with the same care as pull requests against the codebase — this file IS the brand._
