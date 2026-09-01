# 0013 — Payments via PawaPay (Mobile Money)

Date: 2026-08-31
Status: Accepted — resolves the payment half of `0003-payments-and-auth.md`
Amended by: `0019` (settlement no longer depends on the callback)

> **Read `0019` before acting on this record.** The provider choice, the
> authoritative re-fetch, the amount/currency check and the idempotent
> fulfilment step below are all still exactly how this works. What changed is
> the _trigger_: a callback URL turned out to be unavailable to this app, so
> settlement happens by polling instead. The callback route still exists and
> still behaves as described — it is simply optional now.

## Context

`0003-payments-and-auth.md` deliberately left the payment gateway open, naming
Flutterwave only as an example and blocking `feat/tickets-flow` and
`feat/shop-flow` until someone decided explicitly. `PAGES.md` §7 requires
Mobile Money (MTN/Orange) as the lead payment method for a Yaoundé audience,
with card secondary.

The project owner supplied a written PawaPay integration guide drawn from a
previous production system, and asked to target **production directly** rather
than shipping a sandbox-only integration.

`0008-retire-bevy-rsvp.md` raised the stakes: with the Bevy RSVP path removed,
the ticket flow is the only way to say "I'm coming", so it has to cover the
free tier too — not just paid ones.

## Decision

**PawaPay**, using the hosted Payment Page plus asynchronous callback model.

- `POST /v2/paymentpage` creates a hosted page; the buyer is redirected there.
- `GET /v2/deposits/{depositId}` is the **only** authority on whether money
  moved.
- Server-generated `depositId` (UUID v4) is the idempotency key end to end.

Five rules the implementation is built around:

1. **The intent is persisted before the redirect exists.** `payment_intents`
   records what we expect to be paid and what we owe once it is. If the row
   cannot be written, no Payment Page is created — so PawaPay can never
   collect money for something we have no record of owing.
2. **The callback body decides nothing.** It is read for one field,
   `depositId`, and everything else comes from re-fetching the deposit. A
   forged callback claiming `COMPLETED` is checked against PawaPay and dropped.
3. **Amount _and_ currency are compared against the intent** before anything
   is delivered. A mismatch is terminal (`amount_mismatch`), never retried, and
   logged for a human — retrying cannot make the numbers agree.
4. **Delivery is one atomic SQL function.** The guide's "deliver, then mark
   activated" leaves a crash window; `apply_paid_deposit` closes it by doing
   both in one transaction behind a `status = 'pending'` guard, so concurrent
   or replayed callbacks serialise into exactly one delivery.
5. **HTTP status is a control signal.** `200` = terminal, stop resending.
   `5xx` = transient (PawaPay unreachable, intent not yet written), please
   resend.

**Free tier bypasses PawaPay entirely.** A 0 XAF basket cannot be a deposit,
so `fulfilFreeIntent` runs the same fulfilment path directly. The ticket that
comes out is indistinguishable from a paid one at check-in.

**Callback hardening ships in monitor mode.** IP allow-list, Content-Digest
(RFC-9530), HTTP Message Signature (RFC-9421, ECDSA P-256) and anti-replay all
run and log on every request, but each only _rejects_ once its own
`PAWAPAY_ENFORCE_*` flag is set. Turning verification on can therefore never
silently reject a real payment mid-configuration.

## Consequences

- Cameroon-only for now: `country` is hard-coded to `CMR` and `currency` to
  `XAF` in `src/lib/payments/catalog.ts`. Another market means revisiting both.
- **Card payments are not implemented.** `PAGES.md` §7 wants card as a
  secondary option; this integration covers Mobile Money only. Whether PawaPay
  can serve the card path, or whether a second gateway is needed, is a separate
  decision — flagged, not silently dropped.
- ~~The callback URL must be registered in the PawaPay dashboard~~ —
  **superseded by `0019`**: registering it is now optional. Local development
  never needed a tunnel for this reason and now needs one even less.
- `PAWAPAY_ENV` and `PAWAPAY_API_TOKEN` must always agree. A sandbox token
  against the production URL fails as `AUTHENTICATION_ERROR` with no useful
  detail.
- `BADGE_CODE_SECRET` is now load-bearing and **must not rotate**: badge codes
  are a deterministic HMAC of `(depositId, index)`, so changing the key
  invalidates every code already issued.
- Going straight to production means there is no sandbox rehearsal. The
  monitor-mode roll-out and the `payment_events` audit trail are what
  substitute for one — see `docs/guides/payments-runbook.md`.

## Alternatives considered

- **Flutterwave**, named in `PAGES.md` and `0003`. Rejected: PawaPay was the
  owner's explicit instruction and comes with a battle-tested internal guide,
  which is worth more than a nominally broader feature list.
- **Believing the callback body** and skipping the re-fetch. Rejected outright:
  it is the single most expensive mistake available in this design.
