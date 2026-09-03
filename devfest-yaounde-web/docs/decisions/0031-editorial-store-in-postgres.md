# 0031 — Editorial content lives in Postgres, JSON files are the fallback

Date: 2026-09-03
Status: Accepted — closes 0029 (the store), G22 (audit), and the discount write gap

## Context

`0029` left the choice open: keep editing speakers and products in the repo,
or move them to a writable store. The dashboard shipped read-only because a
deployed Next.js app cannot write its own source.

Asked for on 2026-09-03: build the backend the dashboard needs.

## Decision

**Postgres is the live store once a collection is published.** Until then the
site still reads `src/data/*.json` — a fresh clone with no database keeps
working, and publishing is an explicit organiser action rather than a silent
migration of placeholder data.

One row per collection in `editorial_documents` (`speakers`, `team`,
`sessions`, `sponsors`, `faqs`, `products`, `ticket-tiers`, `quotes`,
`stats`, `past-editions`). The payload is the JSON array the pages already
know. Validation is Zod against `src/data/types.ts`, server-side, before the
upsert.

A small `site_settings` row holds the announcement (both languages) and the
privacy / CoC / Bevy URLs. Null falls back to `messages/*.json` and
`site-config.ts`.

Checkout reads products and tiers through the same store. A price in a
request body is still ignored.

`discount_codes` already existed; `POST /api/admin/discounts` and
`PATCH /api/admin/discounts/:code` are the missing write path. Redeemed
counts are not writable from the client.

`admin_audit` records who changed what (G22). Privileged writes — order
status, check-in, wall moderation, content publish, settings, discounts —
insert a row after they succeed. An audit failure is logged and swallowed:
blocking a door scan because the log was down would be worse.

All admin routes re-check `currentOrganiser()` and answer 404 to strangers,
same as the dashboard pages. Writes are rate-limited.

## Consequences

- Organisers edit content without a deploy. A bad publish is still a Zod
  refusal, not a broken page.
- The JSON files remain the seed. After the first publish of a collection,
  editing the file no longer changes the live site for that collection.
- Photo URLs are still paths; uploading images is not this work.
- `quotes` / `stats` / `past-editions` are in the store even though the
  dashboard's content table currently lists the seven collections the brief
  named. They can be published through the same PUT.
