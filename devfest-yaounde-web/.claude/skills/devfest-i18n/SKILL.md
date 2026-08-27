---
name: devfest-i18n
description: Use when adding any user-facing text, creating a new page/route, or writing copy for the DevFest Yaoundé site. Covers the bilingual (French/English) requirement, path-based locale routing, and which content is translatable vs. language-neutral.
---

# DevFest Yaoundé Bilingual Requirement

Source: `docs/content/PAGES.md` §10.2. This is not a "nice to have" — a feature is not done until both languages exist for it.

## The rule

**No user-facing feature ships in one language only.** If you write a new string, add a new page, or introduce new copy, French and English versions must exist before the work is considered complete — not "translate it later."

## Routing

- Path-based locales: `/fr/...` and `/en/...` — never query params (`?lang=fr`). Better for SEO, sharing, and clarity per `PAGES.md`.
- Every route in the sitemap (`/`, `/schedule`, `/speakers`, `/faqs`, `/team`, `/tickets`, `/shop`, `/dp-generator`) must exist under both prefixes.
- Persistent language switcher lives in the navbar, near the ticket button (see `devfest-content-model` skill's global chrome section).
- **Default language: French.** Yaoundé skews Francophone; English is the switch-to option for international speakers/sponsors. This is flagged as an assumption in `PAGES.md` §11 — if it's ever challenged, that's a decision-record-worthy conversation, not a silent flip.

## What must be translated (both `fr` and `en` required)

- Nav labels, all page copy/body text
- Ticket tier descriptions and perks
- FAQ questions and answers
- Email/receipt templates
- DP Generator share captions
- Empty/error/confirmation microcopy (see `devfest-brand-voice` skill for tone)
- Session titles/descriptions *unless* the speaker submitted only one language (see below)

## What stays language-neutral (do not force-translate)

- Speaker and organizer names
- Sponsor names and logos
- Session titles submitted by the speaker in only one language — tag these with a small "original language" indicator in the UI rather than machine- or force-translating them (`PAGES.md` §10.2)

## Implementation notes

- Content data types use a `LocalizedString = { fr: string; en: string }` shape for any translatable field — see `devfest-content-model` skill's data shapes (Speaker.bio, Session.title/description, TicketTier.description/perks, Product.name/description, FaqItem.question/answer, TeamMember.role/oneLiner).
- When adding a new page/route: scaffold both locale segments in the same PR/commit, not as a follow-up.
- When adding a new string: add both `fr` and `en` values in the same change. A PR that adds only one language for a new feature is incomplete, not "mostly done."
