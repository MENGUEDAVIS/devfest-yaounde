# 0025 — Record which ticket the buyer kept

Date: 2026-09-03
Status: Accepted — closes G8 in `docs/backend/GAPS.md`

## Context

"This one's mine" existed in the checkout and drove prefill only. Nothing
recorded it, so `/account` could not tell "my ticket" from "a ticket I bought
for someone else", and a buyer holding five tickets had no way to say which
one was theirs.

Decided 2026-09-03: the site has to know whether someone is paying for
themselves or for another person. If it is for someone else, they type that
person's name; if it is for themselves, their own name goes on it.

## Decision

`tickets.is_self`, written at fulfilment from the attendee record the intent
already stored.

**It answers a different question from `user_id`.** `user_id` says who paid.
`is_self` says which of those tickets the payer means to use. Both matter: one
is for access control, the other is for the person standing at the door with
four tickets on their phone.

**At most one per order**, refused by the schema. You can only be one person,
and the screen already enforces it by unsetting the others — so a body with
two is either a bug or hand-written, and either way it should not be stored.

**Zero is valid and normal.** Buying only for other people is what a team lead
or a parent does. The field is optional, defaults to false, and nothing
requires a buyer to claim a ticket.

## What it is not

**Not a security claim.** It grants nothing and is not verified against the
signed-in identity. Someone can legitimately pay with a Google account whose
address differs from the one they want on the badge, so demanding a match
would break a real case to prevent a harmless one. It is the buyer's own
statement about their own order.

## Consequences

- `/account` can now separate "your ticket" from the ones bought for others,
  and `GET /api/account/tickets` returns the flag.
- Verified against the live database: an order with one `isSelf` attendee and
  one other produced exactly one ticket with `is_self = true`.
- A partial index on `(user_id) where is_self` supports the common read.
- Tickets issued before this migration have `is_self = false` — honest, since
  the answer genuinely was not collected. There are none in production.
- It unblocks the identity half of role badges, should they ever be wanted
  (G19) — though that is explicitly not wanted today.
