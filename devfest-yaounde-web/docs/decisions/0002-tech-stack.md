# 0002 — Tech Stack for the New Build

Date: 2026-08-27
Status: Accepted

## Context

`GETSTARTED_INSTRUCTIONS.md` proposes a stack for the clean-start rebuild but frames it explicitly as a proposal to write up, not something to silently lock in. The prior `legacy/` implementation was a static, zero-dependency HTML/CSS/vanilla-JS site with no framework, no build step, and no i18n — it does not meet the new requirements (bilingual from day one, structured content for speakers/schedule/tickets/shop, room to grow into commerce + auth).

## Decision

Adopting the proposed stack as-is, since nothing in `DESIGN.md` or `PAGES.md` conflicts with it and no cheaper alternative meets the bilingual + structured-content + future-commerce requirements as directly:

- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS, configured with the design tokens extracted from `DESIGN.md` (see the `devfest-design-system` skill)
- **i18n**: `next-intl`, path-based locales (`/fr`, `/en`)
- **Content**: structured JSON for now (speakers, schedule, tickets, shop catalog) — no headless CMS yet; that remains an open future decision if the team wants one
- **Commerce/Auth**: explicitly **not decided yet**. Routes and a shared account model are scaffolded per `PAGES.md` §10.1, but no real payment or auth provider is wired up. See `0003-payments-and-auth.md` (left open).
- **Linting/formatting**: ESLint + Prettier with default/sensible rules, no custom style guide invented beyond what Next.js ships with.

## Consequences

- Locks in TypeScript + App Router conventions for every future feature branch (Step 5 build order) — anyone contributing later should assume these, not vanilla JS patterns from `legacy/`.
- Path-based locales (`/fr/...`, `/en/...`) mean every route added later must be created under both locale segments from the start, per the `devfest-i18n` skill — retrofitting i18n onto an English-only page later is out of scope for "done."
- Structured JSON content means content edits (adding a speaker, a ticket tier, a shop item) are file edits, not CMS entries, until/unless a future decision record introduces a CMS.
- Deliberately leaves the payments/auth provider decision (Flutterwave vs. alternatives; auth provider choice) open — commerce pages (`/tickets`, `/shop`) will ship as scaffolded routes with stub logic only, per Step 5 of `GETSTARTED_INSTRUCTIONS.md`, until that decision is made explicitly.
