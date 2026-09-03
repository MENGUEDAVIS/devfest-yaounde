# 0024 — Per-variant stock, reserved like tier capacity

Date: 2026-09-02
Status: Accepted — closes G12 in `docs/backend/GAPS.md`

## Context

The catalog carried one `status` per product and no per-variant stock, so a
single sold-out size could not be refused — only the whole product. The
frontend enforced availability at product level and explicitly declined to
grey out individual sizes, because doing so would have meant filtering on data
the server did not have.

## Decision

`Product.stock` is an optional list of combinations with a quantity. Omit the
field for an unlimited product; omit one combination to leave that one
unlimited.

**Declared in JSON, counted in the database** — the same split as ticket
capacity, for the same reason. An organiser changes a number in
`products.json`; the server counts what has actually been sold against it.
Moving stock into the database would make a price-or-limit change a migration
instead of a file edit, which `0002` deliberately avoided.

Enforcement mirrors tiers exactly, because the failure mode is identical:

- **Optimistic fast-fail** in `quoteCart` — one order asking for more than a
  combination ever had. It says nothing about what is still free.
- **The binding reservation** inside `create_payment_intent`, under a
  per-combination advisory lock, counting sold (`order_items`) plus held
  (pending intents, inside the reservation window). Counting in TypeScript and
  inserting afterwards would leave the window where two buyers both see the
  last XL as free.

The refusal names the combination — `variant_sold_out:<product>|<size>|<color>`
— so the screen can point at the right control rather than failing generically.

**One key, everywhere.** `variantKey()` builds `productId|size|color`, and the
JSON, the SQL and the UI all count under that exact string. Two spellings of
one combination would silently split a stock figure in half.

`variant_taken()` is a read-only helper for the shop screen. It is
**deliberately approximate**: it counts the same two things the reservation
does, but a page render is a moment in time. Checkout re-checks atomically, so
this can only ever be optimistic — it must never be presented as a promise.

## Consequences

- **Verified against the live database**, not asserted: a combination stocked
  at 8 accepted 8 units and refused the 9th, and `variant_taken` reported 8.
  A unit test cannot show this — removing concurrency removes the bug.
- Overselling a size is now impossible **before** payment rather than
  discovered when packing.
- Stock counts span editions, the same caveat as tier capacity in `0016`:
  `order_items` is counted in full, so reusing a product id next year would
  count this year's sales against it.
- Abandoned checkouts hold their sizes for the reservation window and are
  released by the cron sweep. If that job stops, sizes will look scarcer than
  they are — bounded to 30 minutes.
- The stock numbers currently in `products.json` are **placeholder**, like
  every other value in that file. `XXL/Blanc` is set to 0 on purpose as a
  worked example of a sold-out combination.

## What this does not do

It does not disable individual sizes in the UI. `variant_taken` makes that
possible now, and it is a frontend change — the data it needs finally exists.
