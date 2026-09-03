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

**Milestone: the frontend is done.** Every page in the sitemap is built in both languages and wired to the real backend, links unfurl with a branded image, and misses and crashes land on pages that say something useful. What is left is content, configuration and the backend gaps — not screens: see [What's next](#whats-next).

### What's done

| Page                                    | State                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Home** (`/`)                          | Full-page hero, sponsor marquee, about, stats, speaker preview, schedule preview, memory lane, quotes, FAQ preview, community CTA, full-page footer                                                                                                          |
| **Schedule** (`/schedule`)              | Day tabs, timeline + list views, **parallel tracks**, filters, expandable sessions, add-to-calendar                                                                                                                                                          |
| **Speakers** (`/speakers`)              | Filterable grid with popover detail cards, plus a full-page slider lockup                                                                                                                                                                                    |
| **Team** (`/team`)                      | Same grid + slider, filtered by contribution, with an alumni section                                                                                                                                                                                         |
| **FAQs** (`/faqs`)                      | Grouped accordions, live search, category scrollspy, per-item CTAs                                                                                                                                                                                           |
| **Tickets** (`/tickets`)                | Tier selection, Mobile Money checkout, badge QR + readable code. Free tier RSVPs on Bevy rather than pretending to sell a 0 XAF ticket                                                                                                                       |
| **Shop** (`/shop`)                      | Filterable catalog, product detail in a deep-linkable drawer, device-local bag, discount codes, Mobile Money checkout                                                                                                                                        |
| **DP generator** (`/dp-generator`)      | Eight patterned styles, seven photo looks, torn/brushed edges, five textures, three corner cuts, draggable stickers (shapes, tech, hashtags), 1:1 and 3:4 cards, tilt and rubber-band physics, 1080/2160 PNG export, honest hybrid sharing. No server at all |
| **Account** (`/account`)                | Google sign-in, your tickets with their badge codes, your orders and their state                                                                                                                                                                             |
| **Payment return** (`/payments/return`) | Where PawaPay sends every buyer — polls until the payment settles, then shows the badge. Was a 404 holding a completed payment                                                                                                                               |
| **Community wall** (`/wall`)            | A tilted, self-moving wall of community cards — alternating columns, hover to spotlight. Placeholders until the wall is switched on; `noindex` by decision                                                                                                   |
| **404 / 500**                           | Real error states in both languages — a localised not-found with somewhere to go, an error boundary with a retry and a reference                                                                                                                             |

### Systems behind it

- **Runtime theming** — four dominant colours switchable from the footer, applied before first paint and persisted. Status green/red are fixed tokens so meaning survives a theme swap. See ADR 0011 and `docs/guides/theming.md`.
- **Momentum scroll** (Lenis) behind a single seam, with a floating pill scrollbar reproduced in every nested scroll context. See ADR 0007.
- **One shared filtered-page layout** across all four content pages: a filter rail that floats in the margin without taking width from the content, travels with the scroll, and is clamped to its own section — collapsing to a bottom sheet on narrow screens.
- **One shared overlay shell** (`Modal`) powering both the classic dialog and the slider's full-page takeover, and **one shared bottom sheet** (`BottomSheet`) powering both the mobile filter drawer and mobile card details.
- **No link that goes nowhere** — placeholder URLs are never rendered as anchors: icon-only links are filtered at source, expected labels degrade to plain text. That removed 164 dead anchors, the site's biggest SEO defect.
- **Launch-grade SEO** — per-page, per-locale titles and descriptions, canonical URLs, `hreflang` alternates both ways, OpenGraph and Twitter cards, branded OG images rendered on demand by `next/og`, `sitemap.xml`, `robots.txt` and `Organization`/`Product` structured data. See `docs/guides/seo.md`.
- **Admin dashboard** (`/{locale}/admin`) — organiser-gated server-side, `noindex`, linked from nowhere. Real reads for tickets, transactions, orders, discounts and users; the one write goes through the existing organiser endpoint. See `docs/backend/ADMIN-CAPABILITIES.md`.
- **Branded preloader** — a looping text-scramble over a drifting dot field on first load only, theme-aware, static under reduced motion. See `docs/components/preloader.md`.
- **Custom desktop cursor** — a trailing rounded arrow in the theme's contrasting colour, disabled entirely on touch and under reduced motion. See `docs/guides/custom-cursor.md`.

### Ground rules the build holds to

- **No gradients anywhere** — flat fills only (DESIGN.md §2.6), grep-verified.
- **One dominant colour at a time**, and no sharp corners.
- **French and English in sync** — every user-facing string exists in both, checked for key parity.
- **`prefers-reduced-motion` honoured on every animation.**
- **No dependency without an ADR** in `docs/decisions/`.

### What's next

> **Picking this up?** Start at [`docs/README.md`](docs/README.md) — it routes
> by what you are trying to do, and lists which decision records are current.

**Configuration, before anything can actually be sold.** `BADGE_CODE_SECRET`, the PawaPay token and the AWS relay all fail quietly if they are wrong — money leaves accounts and no ticket appears. The full list is `docs/setup/remaining-work.md` §1, and the gaps the UI deliberately did not paper over are `docs/backend/GAPS.md`.

**Real content.** Everything in `src/data/` is placeholder — speakers, sessions, team, sponsors, and now ticket tiers and shop products too. The tier names and prices in particular are invented mock data and must not ship: `docs/guides/updating-tickets-and-shop.md` and the pre-launch checklist in `docs/setup/deployment.md`.

**Still open:** card payments (Mobile Money only today), refunds, organiser tools, buyer-settable fulfilment, role-badge verification, and the community wall's backend — the frontend for it is written and switched off (ADR 0021, GAPS.md G20).
