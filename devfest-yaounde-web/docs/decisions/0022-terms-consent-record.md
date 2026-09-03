# 0022 — The refund acknowledgment is recorded as evidence

Date: 2026-09-02
Status: Accepted — closes G9 in `docs/backend/GAPS.md`

## Context

The non-refundable acknowledgment gated the pay button in the browser and
nowhere else. `ticketCheckoutSchema` had no field for it, so a request posted
straight to `/api/checkout/tickets` succeeded without it. The frontend phase
shipped the gate anyway — correctly, it is the right interface — and recorded
in G9 that it "does not pretend the consent is recorded", leaving the question
open.

Decided 2026-09-02: **it must leave a server-side trace.** Once someone has
paid there is no refund, and that has to be provable rather than remembered.

## Decision

Both checkout schemas now require `acceptedTerms: z.literal(true)`. A body
without it, or with `false`, is refused with `terms_not_accepted`.

**A boolean on its own is not evidence.** What makes a consent record hold up
is _when_ it was given and _against which wording_ — the same reasoning the DP
gallery contract already applies to its own consent column. So
`payment_intents` gained two columns, written inside the same transaction that
creates the intent:

| Column              | Source                                         |
| ------------------- | ---------------------------------------------- |
| `terms_accepted_at` | `now()` — **the server's clock**               |
| `terms_text`        | Looked up server-side from `messages/<locale>` |

**Neither is taken from the request.** This is the part that matters:

- A timestamp supplied by a browser proves nothing about when anything was
  shown, so the server stamps its own.
- If the client supplied the wording, a forged body could record that the
  buyer agreed to something they never saw — destroying the evidence exactly
  when it would be needed. `refundAcknowledgment()` re-reads the same string
  the screen rendered, for the same locale.

The client's only say is the fact of acceptance.

**Tickets and goods record different wording**, because they have different
terms and always did: a ticket is not refundable at all, while goods can be
replaced when they arrive damaged, faulty or wrong
(`docs/content/refund-policy.md`). Storing the ticket sentence against a shop
order would be false evidence. `terms.ts` reads `pages.tickets.refundAck` or
`pages.shop.returnsAck` accordingly.

**The literal type carries into the browser.** `checkoutTickets` and
`checkoutShop` declare `acceptedTerms: true`, so a call site cannot forget it
or pass `false` — the compiler refuses. Both buttons were already disabled
until the box is ticked, so no interface changed.

## Consequences

- **The API is now stricter**, and that is a deliberate breaking change. Any
  caller — including a test script or a curl command — must send
  `acceptedTerms: true`. Frontend and backend deploy from the same repo, so
  they move together and there is no window where consent is optional.
- `refundAcknowledgment` **throws** on a missing translation key rather than
  storing a placeholder. An order whose consent record says "unknown" is not
  evidence, and a missing key is a build mistake worth failing on.
- Orders placed before this migration have `terms_accepted_at IS NULL`. That
  is honest — the consent genuinely was not recorded then — and it is how to
  find them. There are none in production yet.
- Changing the acknowledgment wording later does **not** rewrite past records:
  each order keeps the sentence that was on screen when it was placed. That is
  the point of storing the text rather than a version number.
- Migration `0005` had to `drop` the previous `create_payment_intent` before
  recreating it. Adding a defaulted parameter to `create or replace` produces
  an _overload_, and a call with the old argument list would then be ambiguous
  rather than replaced — a failure that only appears at runtime.

## What this does not do

It does not make the terms enforceable by itself. It records what was shown
and when it was accepted; whether that is sufficient is a question for whoever
handles a dispute, not for this code. What it removes is the gap where the
answer would have been "we think they ticked a box".
