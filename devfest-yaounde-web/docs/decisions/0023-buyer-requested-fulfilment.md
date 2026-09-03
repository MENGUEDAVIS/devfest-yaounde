# 0023 — The buyer says how they want their order

Date: 2026-09-02
Status: Accepted — closes G13 in `docs/backend/GAPS.md`

## Context

`orders.fulfilment` has existed since migration 0001, but only an organiser
could write it, through `PATCH /api/orders/:id/status`. `shopCheckoutSchema`
had no field for it, so a buyer's choice had nowhere to go.

The frontend phase found this and removed the pickup-vs-delivery picker rather
than ship a control that collects an answer and discards it — the right call,
and the same reasoning that keeps the DP community wall switched off. It left
an honest line in its place and handed the backend half over.

## Decision

`shopCheckoutSchema.fulfilment` is now accepted, optional:

```ts
{ method: "pickup" | "shipping", note?: string }   // note ≤ 300 chars
```

`shipping`, not `delivery`, because those are the two words organisers have
written into that column since 0001. Two vocabularies for one field would
drift within a week.

It rides on `payment_intents.fulfilment` and is copied onto the order at
fulfilment, **nested under `requested`**. That nesting is the point: an
organiser adding a courier reference later sits beside the buyer's answer
rather than on top of it.

`PATCH /api/orders/:id/status` was changed to **merge** rather than replace.
It previously overwrote the whole column, which would have erased the request
the first time anyone touched the order — a bug that would only have appeared
after the feature looked finished.

The picker is back on the checkout screen, sending what it collects.

## Scope, deliberately narrow

**This is a preference, not a shipping engine.** No zones, no fees, no pickup
windows — all of those are still undecided (`PAGES.md` §11), and inventing
them here would be the same mistake in a different direction. The copy still
says the team coordinates afterwards, because it does.

What it removes is the round-trip where somebody had to message every buyer to
ask "pickup or delivery, and where?".

## Consequences

- Orders now carry the buyer's intent from the moment they are placed, so the
  merch table can sort a pile without chasing anyone.
- The note is free text, capped and trimmed. It is a landmark or a
  neighbourhood, not an address schema — deciding on structured addresses
  needs the logistics questions answered first.
- Tickets are unaffected: `startCheckout` drops the field for that kind, and
  there is nothing to deliver.
- If zones and fees are ever priced, this field is where the input already is
  — but pricing them means recomputing totals server-side, which is a
  different and larger change.
