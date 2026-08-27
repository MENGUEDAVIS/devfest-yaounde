# Local Development Setup

## Requirements

- Node.js 20+ (built and tested with Node 22)
- npm (the project uses `package-lock.json`, not yarn/pnpm)

## Getting started

```bash
cd devfest-yaounde-web
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`. Visiting `/` redirects to the default locale (`/fr`) per the i18n routing config in `src/i18n/routing.ts`.

## Scripts

| Command                | What it does                                                                     |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`          | Start the local dev server                                                       |
| `npm run build`        | Production build (also type-checks)                                              |
| `npm run start`        | Run a built app                                                                  |
| `npm run lint`         | ESLint (Next.js core-web-vitals + TypeScript rules, Prettier conflicts disabled) |
| `npm run format`       | Format the whole project with Prettier                                           |
| `npm run format:check` | Check formatting without writing changes                                         |

## Environment variables

None required yet. This project has no payment provider, auth provider, or CMS wired in — see `docs/decisions/0003-payments-and-auth.md` for what's still open. Once those are decided, their required env vars (API keys, webhook secrets, etc.) should be documented here and added to a `.env.example` file — do not commit real secrets.

## Project structure

```
devfest-yaounde-web/
  src/
    app/
      globals.css        # design tokens (Tailwind v4 @theme block) — see DESIGN.md
      [locale]/           # every route lives under this dynamic segment
        layout.tsx
        page.tsx           # Home
        schedule/
        speakers/
        faqs/
        team/
        tickets/
        shop/
        dp-generator/
    i18n/
      routing.ts          # locales + default locale
      navigation.ts       # locale-aware Link/router helpers
      request.ts          # next-intl request config
    proxy.ts              # locale-detection proxy (Next.js 16's replacement for middleware.ts)
  messages/
    fr.json               # French UI strings
    en.json                # English UI strings
  docs/                    # decisions, design/content source copies, guides, setup
  .claude/skills/          # project-specific Claude Code skills (design, content, i18n, voice, docs workflow)
```

## A known open gap: fonts

`DESIGN.md` specifies **Google Sans** and **Google Sans Mono** as the typefaces, but these are Google's internal/proprietary fonts — they are not published on Google Fonts (`fonts.google.com`) for general web use via `next/font/google`. The site currently falls back to the documented fallback stack (`'Google Sans', 'Product Sans', 'Inter', system-ui, sans-serif`) with no font actually named "Google Sans" loaded. Sourcing an actual licensed copy of Google Sans (e.g. through Google's internal brand asset channels, if the organizing team has access) or picking a closely-matching substitute is an open item for whoever picks up visual polish next — not something this bootstrap invented a workaround for.

## Localization

Path-based locales (`/fr`, `/en`), default `fr`. See `.claude/skills/devfest-i18n/SKILL.md` for the full rules on what must be translated vs. language-neutral before a feature counts as done.
