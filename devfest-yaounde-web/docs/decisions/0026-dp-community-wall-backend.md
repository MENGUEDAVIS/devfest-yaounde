# 0026 — The community wall backend

Date: 2026-09-03
Status: Accepted — implements the contract, closes the code half of G20
Amended by: `0027` (cards now publish without review)

> **Read `0027` before acting on this record.** Every safeguard below still
> stands except one: cards no longer wait for approval. The review endpoints
> remain, as a remedy rather than a gate.

## Context

ADR 0021 decided the wall should exist and narrowly reversed the no-upload
rule of ADR 0015. The frontend was written against a contract
(`docs/backend/dp-gallery-contract.md`) and shipped switched off, because a
button that quietly fails is worse than no button.

Asked for on 2026-09-03: finish it.

## Decision

Built exactly to the contract. Five routes, one table, one private bucket.

| Route                         | Who                              |
| ----------------------------- | -------------------------------- |
| `POST /api/dp/gallery`        | anyone, rate-limited by IP       |
| `GET /api/dp/gallery`         | anyone — approved cards only     |
| `DELETE /api/dp/gallery/:id`  | whoever holds the takedown token |
| `GET /api/dp/gallery/pending` | organisers — the review queue    |
| `PATCH /api/dp/gallery/:id`   | organisers — approve or reject   |

**Everything here follows from one fact: this publishes photographs of faces.**

- ~~**Nothing is public until a human approves it.**~~ **Amended by `0027`:**
  cards land `approved` unless `DP_GALLERY_REVIEW=1`. The wall query still
  filters on `approved`, and rejection still deletes the image — review became
  a remedy instead of a gate.
- **The bytes are validated by decoding them.** A `Content-Type` is a claim a
  browser makes; a small file can still declare enormous dimensions. The
  dimension cap is checked on the decoded image, and the whole thing is
  re-encoded, so nothing a stranger supplied is ever served back. Re-encoding
  discards EXIF as a side effect — the client's canvas output should carry
  none, but "should" is not a guarantee about bytes off the network.
- **The takedown token is stored as a hash**, for the same reason a password
  is. It is returned to the browser once. Comparison is constant-time, and a
  wrong token answers exactly like a missing card, so the endpoint cannot be
  used to discover which ids exist.
- **Rejection deletes the image.** Hiding it would leave a rejected face in a
  bucket — the precise harm review exists to prevent.
- **The bucket is private.** Reads go through a short-lived signed URL minted
  per request, so a withdrawn card stops being reachable the moment its row
  changes rather than whenever a CDN forgets it.
- **RLS grants `anon` and `authenticated` nothing at all**, not even for
  approved rows. Everything goes through the routes with the service role.
- **The consent wording is resolved server-side**, never taken from the body —
  the same rule as ADR 0022, and it matters more here: this record is what
  says someone agreed to their face being shown.

**The wall shuffles rather than sorting newest-first.** Asked for directly, and
it is the better default: an early submission is not buried by a late rush.
`?order=newest` is still there.

**The server checks the flag too**, not just the button. Otherwise the wall
would be reachable by anyone reading the source while the team believed it
off.

## Consequences

- Verified against the live project rather than asserted — see the G20 entry
  in `GAPS.md` for the twelve checks and their results.
- **The flag stays off, and turning it on is a judgement, not a deploy.** Three
  things must exist first: someone who works the queue, a way to honour a
  takedown from a person who lost their token, and a retention rule. The
  `.env.example` entry says so where it will be read.
- **Retention is deliberately not implemented.** How long a wall from this
  edition stays up was left to be agreed, and a purge job written against an
  undecided rule would either delete too early or give false assurance. When
  the rule exists it belongs in the existing cron.
- **No screen exists** for the wall or the queue. The queue is workable from
  any HTTP client, which is what makes turning the flag on safe; an interface
  built before a single card has been submitted would be guessing.
- `sharp` is used for decode and re-encode. Already present — Next.js ships it
  for image optimisation — and imported dynamically, so a request that never
  touches the wall never loads a native module.
- This re-arms the "Uploads (DP Generator)" section of
  `docs/setup/security-checklist.md`, which ADR 0015 had struck out. It
  applies again, and the measures above are the answer to it.

## The instruction that is not code

**Do not publish cards of children.** The generator asks nobody's age and
should not start, so this is a judgement the reviewer makes, every time.
