# 0016 — Reserve capacity and discount redemptions in the database

Date: 2026-08-31
Status: Accepted

## Context

Two concurrency bugs shipped with the first payment implementation (`0013`).

**Tier stock did not limit anything.** `quoteTickets` compared
`quantityAvailable` against the number of attendees _in the current order_
only. A tier with 40 seats accepted 40 tickets per order, from an unlimited
number of orders. The check read as a stock check and was not one.

**`max_redemptions` was advisory.** The counter was read when the basket was
priced, but only incremented at fulfilment. Every concurrent checkout in
between read the same pre-increment value, so a single-use sponsor code could
be redeemed by everyone who pasted it at once.

Both were found by re-reading the code after the schema was deployed, not by a
failure in production — no money had moved yet.

## Decision

Neither bug can be fixed in application code. Counting in TypeScript and
inserting afterwards leaves a window in which two callers both read the last
seat as free; that is the definition of the bug, not an implementation detail
of it. **The check and the insert have to be one transaction.**

So intent creation moved into `create_payment_intent`, a `plpgsql` function
that, in a single transaction:

1. takes a transaction-scoped advisory lock per tier (`pg_advisory_xact_lock`),
   iterating tiers in sorted order so concurrent orders cannot deadlock;
2. counts issued tickets **plus** seats held by other pending intents;
3. refuses with `sold_out:<tierId>` if this order would exceed capacity;
4. takes an advisory lock on the discount code and applies the same
   committed-plus-in-flight arithmetic, refusing with `discount_exhausted`;
5. inserts the intent.

A **pending intent holds its reservation for a bounded window**
(`RESERVATION_WINDOW_SECONDS`, 30 minutes) — long enough to finish a Mobile
Money prompt on a slow network, short enough that an abandoned tab does not
sit on the last ticket. `/api/cron/cleanup` then fails intents older than an
hour outright, so the table stays readable and the seats are unambiguously
released.

Capacity stays in `src/data/ticket-tiers.json` and is passed into the function
as `{tierId: capacity}`. The database counts; the JSON decides. An organiser
changing a limit is still a file edit, per `0002-tech-stack.md`.

The optimistic check in `quoteTickets` is kept, but only as a fast-fail for
"this one order wants more than the tier ever had", and its comment now says
so. The binding check is the reservation.

## Consequences

- **Both fixes are verified against the live database**, not asserted: 40
  Opus tickets reserved, the 41st refused; a single-use code accepted once,
  refused the second time. A unit test could not have shown either, because
  removing concurrency removes the bug.
- Overselling is now impossible **before** payment rather than being detected
  after it. That matters: refunding a Mobile Money payment for a seat that did
  not exist is a manual, unpleasant process.
- Intent creation is one round trip rather than one insert — negligible, and it
  happens once per checkout.
- A **crashed cleanup job silently shrinks apparent capacity**, since expired
  intents keep holding seats until the window passes. The window is the
  backstop, so the damage is bounded to 30 minutes even if the cron never runs.
- Capacity now spans editions: `tickets` is counted in full. When a future
  edition reuses a tier id, the count has to be scoped by edition — flagged
  here rather than discovered then.
- Migration `0003` exists only because Postgres reports a parameter without a
  DEFAULT as required, so the generated types made "no discount code"
  unexpressible. The function now reads `NULL` and `''` identically.

## Alternatives considered

- **A `SERIALIZABLE` transaction** instead of advisory locks: correct, but it
  surfaces as serialisation failures the application must retry, and a retry
  loop around a payment intent is a worse thing to get wrong than a lock.
- **A stock column decremented atomically**: would move capacity out of JSON
  and into the database, contradicting `0002` and making a price/limit change
  a migration instead of a file edit.
- **Checking capacity at fulfilment**: too late. The money has already moved.
