# 0033 — The community wall is on

Date: 2026-09-04
Status: Accepted — amends 0021 / 0026 / 0030 on the default, closes G21

## Context

`0026` built the backend and left the flag off: turning it on was a
judgement, not a deploy. Three things had to exist first: someone who watches
the wall, a takedown for a person who lost their token, and a retention rule.

All three exist. Retention is 200 days (`gallery-retention.ts`). A lost token
is an organiser `PATCH` that rejects and deletes the image. Auto-approval
(`0027`) means watching happens after publication, which only works if a
visitor can raise a hand — that was G21, still open.

Asked for on 2026-09-04: turn the wall on.

## Decision

**The wall is on unless a deployment sets `NEXT_PUBLIC_DP_GALLERY=0`.**

`next.config.ts` defaults the public flag to `1`. An empty string (the
`.env.example` copy-paste) no longer keeps it dark. `0` is the explicit off.

**Visitors can report a card.** `POST /api/dp/gallery/:id/report` is
unauthenticated, rate-limited by IP, one row per address per card. The
dashboard lists those rows; Remove is the existing reject, which still
deletes the image.

Cards still publish on arrival (`0027`). The wall is still `noindex` (`0030`).
The instruction stands: do not leave a card of a child up.

## Consequences

- The generator shows the wall control. `/wall` fetches live cards; an empty
  wall still falls back to labelled placeholders.
- Organisers watch from `/en/admin` → Community wall. There is still no
  email ping when a report lands — reload the panel.
- Turning it off is one environment variable, not a revert.
