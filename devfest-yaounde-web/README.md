# DevFest Yaoundé — Website

The reusable, multi-year template site for DevFest Yaoundé (GDG Yaoundé). Bilingual (French/English), Next.js App Router, Tailwind CSS.

This folder is a fully self-contained project root — it doesn't depend on anything outside it in this repo. See `../legacy/` for the earlier, archived implementation this replaced (not used as a reference for this build — see `docs/decisions/0001-initial-scaffold.md`).

## Start here

- **Design system**: `docs/design/DESIGN.md` (colors, type, icons, imagery, motion) — condensed into `.claude/skills/devfest-design-system/`.
- **Content model**: `docs/content/PAGES.md` (sitemap, page-by-page content, data shapes) — condensed into `.claude/skills/devfest-content-model/`.
- **Decisions made so far**: `docs/decisions/` — read these before assuming a tech choice isn't final.
- **Local dev setup**: `docs/setup/local-development.md`.

## Quick start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/fr` (default locale). Full details in `docs/setup/local-development.md`.

## Status

Scaffolded, not feature-complete. Routes exist as placeholders for every page in the sitemap, in both languages. No payment provider or auth provider is wired in yet — see `docs/decisions/0003-payments-and-auth.md`.
