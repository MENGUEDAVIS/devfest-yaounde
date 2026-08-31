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

**Milestone: the main site is built, and the commerce backend behind it.** Home, Schedule, Speakers, Team and FAQs are complete in both languages. Tickets, Shop and the DP generator now have a full backend — checkout, payments, fulfilment, check-in, receipts — but **no screens yet**; their routes are still the placeholder pages.

### What's done

| Page                               | State                                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** (`/`)                     | Full-page hero, sponsor marquee, about, stats, speaker preview, schedule preview, memory lane, quotes, FAQ preview, community CTA, full-page footer |
| **Schedule** (`/schedule`)         | Day tabs, timeline + list views, **parallel tracks**, filters, expandable sessions, add-to-calendar                                                 |
| **Speakers** (`/speakers`)         | Filterable grid with popover detail cards, plus a full-page slider lockup                                                                           |
| **Team** (`/team`)                 | Same grid + slider, filtered by contribution, with an alumni section                                                                                |
| **FAQs** (`/faqs`)                 | Grouped accordions, live search, category scrollspy, per-item CTAs                                                                                  |
| **Tickets** (`/tickets`)           | **Placeholder** — blocked on ADR 0003                                                                                                               |
| **Shop** (`/shop`)                 | **Placeholder** — blocked on ADR 0003                                                                                                               |
| **DP generator** (`/dp-generator`) | **Placeholder** — blocked on ADR 0003                                                                                                               |

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

> **Picking this up?** Two documents answer most questions:
> `docs/guides/frontend-integration.md` (every endpoint the screens call) and
> `docs/setup/remaining-work.md` (what is left, and what blocks a real sale).

**The interfaces.** Every endpoint the ticket flow, the shop and the DP generator need exists and is tested; what is missing is the UI on top. See `docs/guides/payments-runbook.md` and `docs/guides/check-in-and-orders.md` for what they call.

**Real content.** Everything in `src/data/` is placeholder — speakers, sessions, team, sponsors, and now ticket tiers and shop products too. The tier names and prices in particular are invented mock data and must not ship: `docs/guides/updating-tickets-and-shop.md` and the pre-launch checklist in `docs/setup/deployment.md`.

**Still open:** card payments (Mobile Money only today), refunds, and a public gallery for the DP generator would reverse ADR 0015.
