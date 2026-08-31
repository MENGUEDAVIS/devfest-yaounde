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
| `npm test`             | Unit tests for the payment/catalog logic (`tests/`, Node's test runner)          |
| `npm run verify`       | lint + typecheck + tests — run this before pushing                               |

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. Every variable is
documented in that file; the summary:

| Variable                                                    | Needed for                                              |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `APP_BASE_URL`, `NEXT_PUBLIC_APP_BASE_URL`                  | building the PawaPay return URL                         |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sign-in and reading your own tickets/orders             |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | checkout and fulfilment — **bypasses RLS, server-only** |
| `PAWAPAY_ENV`, `PAWAPAY_API_TOKEN`                          | creating payment pages and checking deposits            |
| `BADGE_CODE_SECRET`                                         | ticket badge/QR codes — set once, never rotate          |
| `PAWAPAY_CALLBACK_*`                                        | optional callback hardening (monitor mode by default)   |

**The informational pages run without any of this.** Home, Schedule, Speakers,
FAQs and Team render fine on a fresh clone with no `.env.local` at all — only
the ticket, shop and account routes need the variables above.

`.env.example` is committed on purpose (`.gitignore` has an explicit
exception for it); real `.env*` files are not. Never commit a filled-in copy.

See `docs/guides/payments-runbook.md` for the order to set things up in, and
`docs/decisions/0013` / `0014` for why these providers

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

## The Grammarly hydration warning (benign — already handled)

If you see a React hydration warning in the console naming
`data-new-gr-c-s-check-loaded` and `data-gr-ext-installed` on `<body>`,
**that is the Grammarly browser extension, not our code.** The extension
writes those attributes onto `<body>` before React hydrates, so the server
HTML and the client DOM legitimately differ by two attributes.

`suppressHydrationWarning` is set on `<body>` in
`src/app/[locale]/layout.tsx` for exactly this reason. It is deliberately
scoped to that one element: React only suppresses one level deep, so any
_real_ mismatch inside the tree still surfaces normally.

This was verified rather than assumed — with the extension's attributes
simulated the warning appears, and without them the console is completely
clean, so nothing genuine is being masked. The usual real culprits were
also checked and ruled out: no `Math.random()`/`Date.now()` runs during
render (`ConfettiBurst`'s randomness sits in a `useState` initializer on a
component that never server-renders, and `Date.now()` is only in an event
handler), there are no `typeof window` branches in render, and the one
locale-formatted number (`StatCounter`) now takes an explicit locale
instead of relying on the runtime default.

**Don't widen `suppressHydrationWarning` to other elements** to silence a
future warning — if one appears somewhere else, it's real, and the cause
should be fixed.

## A known open gap: fonts

`DESIGN.md` specifies **Google Sans** and **Google Sans Mono** as the typefaces, but these are Google's internal/proprietary fonts — they are not published on Google Fonts (`fonts.google.com`) for general web use via `next/font/google`. The site currently falls back to the documented fallback stack (`'Google Sans', 'Product Sans', 'Inter', system-ui, sans-serif`) with no font actually named "Google Sans" loaded. Sourcing an actual licensed copy of Google Sans (e.g. through Google's internal brand asset channels, if the organizing team has access) or picking a closely-matching substitute is an open item for whoever picks up visual polish next — not something this bootstrap invented a workaround for.

## Localization

Path-based locales (`/fr`, `/en`), default `fr`. See `.claude/skills/devfest-i18n/SKILL.md` for the full rules on what must be translated vs. language-neutral before a feature counts as done.
