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

**Milestone: every page in the sitemap is built.** Home, Schedule, Speakers, Team and FAQs, and now Tickets, Shop, the account area, the payment return page and the DP generator — all in both languages, all wired to the real backend. What is left is content and configuration, not screens: see [What's next](#whats-next).

### What's done

| Page                                    | State                                                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** (`/`)                          | Full-page hero, sponsor marquee, about, stats, speaker preview, schedule preview, memory lane, quotes, FAQ preview, community CTA, full-page footer  |
| **Schedule** (`/schedule`)              | Day tabs, timeline + list views, **parallel tracks**, filters, expandable sessions, add-to-calendar                                                  |
| **Speakers** (`/speakers`)              | Filterable grid with popover detail cards, plus a full-page slider lockup                                                                            |
| **Team** (`/team`)                      | Same grid + slider, filtered by contribution, with an alumni section                                                                                 |
| **FAQs** (`/faqs`)                      | Grouped accordions, live search, category scrollspy, per-item CTAs                                                                                   |
| **Tickets** (`/tickets`)                | Tier selection, Mobile Money checkout, badge QR + readable code. Free tier RSVPs on Bevy rather than pretending to sell a 0 XAF ticket               |
| **Shop** (`/shop`)                      | Filterable catalog, product detail in a deep-linkable drawer, device-local bag, discount codes, Mobile Money checkout                                |
| **DP generator** (`/dp-generator`)      | Name, photo, five branded frames, drag-and-zoom crop over a live preview, real PNG download, share sheet with a clipboard fallback. No server at all |
| **Account** (`/account`)                | Google sign-in, your tickets with their badge codes, your orders and their state                                                                     |
| **Payment return** (`/payments/return`) | Where PawaPay sends every buyer — polls until the payment settles, then shows the badge. Was a 404 holding a completed payment                       |

### Systems behind it

- **Runtime theming** — four dominant colours switchable from the footer, applied before first paint and persisted. Status green/red are fixed tokens so meaning survives a theme swap. See ADR 0011 and `docs/guides/theming.md`.
- **Momentum scroll** (Lenis) behind a single seam, with a floating pill scrollbar reproduced in every nested scroll context. See ADR 0007.
- **One shared filtered-page layout** across all four content pages: a filter rail that floats in the margin without taking width from the content, travels with the scroll, and is clamped to its own section — collapsing to a bottom sheet on narrow screens.
- **One shared overlay shell** (`Modal`) powering both the classic dialog and the slider's full-page takeover, and **one shared bottom sheet** (`BottomSheet`) powering both the mobile filter drawer and mobile card details.
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

**Still open:** card payments (Mobile Money only today), refunds, organiser tools, buyer-settable fulfilment, and the community handles for the DP share caption. A public gallery of generated DPs would reverse ADR 0015 and should be a new decision record, not a quiet feature.
