# Theming the site

The site ships **one dominant colour family at a time**. Yellow is the
default; visitors can switch to Blue, Red or Green from the footer, and the
choice is remembered in their browser.

See [ADR 0011](../decisions/0011-runtime-theming.md) for why it works this
way, and DESIGN.md §2.5 for the design rule.

## The three tokens you use

| Token              | Tailwind utility | Use for                              |
| ------------------ | ---------------- | ------------------------------------ |
| `--color-primary`  | `bg-primary`     | The dominant fill: CTAs, stamps, tabs |
| `--color-halftone` | `bg-halftone`    | Bright accents, markers, selection    |
| `--color-pastel`   | `bg-pastel`      | Section washes, hover fills           |

**Always use these.** Never `bg-yellow`, `bg-blue-pastel`, or
`var(--color-yellow)` in a component — those name one family and will not
follow the theme. The switch will visibly skip them.

## The two tokens you must NOT theme

| Token                          | Utility        | Meaning                    |
| ------------------------------ | -------------- | -------------------------- |
| `--color-success` / `-pastel`  | `bg-success…`  | in stock, confirmed, open  |
| `--color-danger` / `-pastel`   | `bg-danger…`   | sold out, error, urgent    |

These are green and red under **every** theme, on purpose. A "sold out" pill
that turns green because someone picked the Green theme is a bug, not a
feature. `Badge` and `Button` expose them as `tone="success"` / `tone="danger"`.

## Adding a theme

1. Add the family's three hexes to `:root` in `src/app/globals.css` (they
   probably already exist — all four Google families are defined).
2. Add a `:root[data-theme="<name>"]` block mapping `--color-primary`,
   `--color-halftone` and `--color-pastel` to them.
3. Add the name to `THEMES` in `src/lib/theme.ts` — the footer switcher, the
   pre-paint script and the stored-value validation all read from that one
   array.
4. Add `common.theme.<name>` to **both** `messages/fr.json` and
   `messages/en.json`.

Order matters: `THEMES` is the order the swatches appear in.

## Changing the default

`DEFAULT_THEME` in `src/lib/theme.ts`, and the `--color-primary` /
`--color-halftone` / `--color-pastel` values in the bare `:root` block, which
is what renders before any attribute is set. Keep the two in sync — the bare
`:root` is what a first-time visitor sees.

## What is deliberately not themed

- **The DevFest logo** (`DevFestLogo.tsx`, `icon.svg`). It's Google's
  four-colour brand mark; recolouring it would be wrong regardless of theme.
  These are the only files outside `globals.css` that should contain a raw hex.
- **Photography and placeholder imagery.**
- **Status colours**, as above.

## Checking your work

```bash
# Any component naming a colour family directly is a theming bug:
grep -rn "bg-yellow\|bg-blue-\|bg-green-\|bg-red-\|--color-yellow" src/components src/app --include=*.tsx

# And no gradients, ever (DESIGN.md §2.6):
grep -rn "gradient" src/
```

Then switch through all four swatches in the footer and look for anything
that stayed yellow.
