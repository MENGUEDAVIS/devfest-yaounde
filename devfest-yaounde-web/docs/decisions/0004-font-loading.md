# 0004 — Font Loading: Google Sans / Google Sans Code

Date: 2026-08-27
Status: Accepted

## Context

`DESIGN.md` §1.1 originally named the mono accent typeface "Google Sans Mono," matching the GDG brand decks. That name doesn't exist on Google Fonts — the published family name there is **Google Sans Code**. `DESIGN.md` was corrected to reflect this (dated correction note in §1.1), and this project's font-loading needed to move from "fallback stack only" (the bootstrap's placeholder state) to actually loading the real families.

## Decision

Checked the installed Next.js version's (16.3.3) bundled Google Fonts manifest directly (`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`) rather than assuming either way. Both **Google Sans** and **Google Sans Code** are present, with the weights and `latin` subset this project needs (Google Sans: 400/500/600/700 + variable; Google Sans Code: 300–800 + variable).

Given that, loaded both directly via `next/font/google` — no self-hosted `next/font/local` fallback was necessary:

- `src/app/[locale]/layout.tsx`: `Google_Sans` → CSS variable `--font-google-sans`, `Google_Sans_Code` → `--font-google-sans-code`, both restricted to the `latin` subset and weights `400/500/600/700`.
- `src/app/globals.css`: `--font-sans` and `--font-mono` Tailwind theme tokens now resolve to the loaded variables first, falling back to the `DESIGN.md` §1.1 fallback stack only if the load ever fails.

Verified with a full `next build`: the fonts are fetched and self-hosted as `.woff2` files under `.next/static/media/`, and preloaded on rendered pages. Build produces two benign warnings ("Failed to find font override values... skipping generating a fallback font") — `next/font`'s automatic fallback-metric generation doesn't have override data for these two families yet, so it skips that specific optimization; it does not affect the font loading itself.

## Consequences

- No `fonts/` directory or self-hosted binaries were added to the repo — both fonts are fetched and cached by the Next.js build itself, same as any other `next/font/google` usage. Simpler than the self-hosting fallback path, with no manual licensing check needed since Google Fonts' hosted delivery already implies redistribution is fine.
- If a future Next.js upgrade ships a font-data manifest that drops these families (unlikely, but they were recently added to Google Fonts), the build will fail loudly at that `next/font/google` import — that's the trigger to revisit self-hosting via `next/font/local`, not something to work around silently.
- The `devfest-design-system` skill was updated to reference `Google Sans Code` (not "Google Sans Mono") and to point to the loaded CSS variables.
