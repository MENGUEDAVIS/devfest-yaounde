# 0019 — Settle payments by polling, not by callback

Date: 2026-09-01
Status: Accepted, **amended by 0028**

> **Amended by `0028`:** the five-minute sweep is still `/api/cron/cleanup`,
> but Supabase `pg_cron` invokes it. Vercel Hobby cannot run Cron more than
> once a day. The poll, the route and the guarded delivery are unchanged.

## Context

`0013` built the payment flow around PawaPay's callback, following the
integration guide: the callback arrives, we re-fetch the deposit, we deliver.

Then the constraint surfaced. **A PawaPay account has one callback URL per
operation type** — Deposits, Refunds, Checkouts — not one per application.
The Deposits field on this account already points at the SCD shop's AWS
Lambda, and the documentation contradicts itself about whether a Payment Page
fires the Deposits or the Checkouts callback.

The obvious fix was a second PawaPay account. That turns out to be
unavailable: a second merchant account means registering another legal
entity, not filling in a form. So the callback field cannot be freed, and
this application has to work without owning one.

## Decision

**Stop depending on the callback.** Settlement now happens by asking PawaPay,
in two places:

1. **The return page poll** (`GET /api/payments/status`) now fulfils. Most
   buyers watch that page, so most payments settle within seconds — the same
   perceived latency as a callback.

   > **Corrected 2026-09-04 by observation.** "Within seconds" was optimistic.
   > Real Mobile Money settlement here regularly takes minutes: the buyer
   > confirms on a USSD prompt and the operator reports back when it reports
   > back. The page watched for two minutes and then stopped — while still
   > showing a spinning spinner, so "waiting" and "no longer waiting" looked
   > identical. A payment that landed at three minutes was settled by the
   > five-minute sweep instead, and the buyer sat in front of a spinner for
   > ten. The poll now backs off over a quarter of an hour (4s → 8s → 20s)
   > and, when it does stop, says so with a different icon and a way to
   > re-check. The sweep remains the safety net; it is no longer the normal
   > path for someone sitting on the page.

2. **A reconciliation sweep** (`reconcilePendingDeposits`, run from
   `/api/cron/cleanup` every five minutes) checks every pending deposit older
   than 90 seconds. This catches the closed tab, the dead battery, the
   dropped network.

The callback route stays exactly as it was. If the `Checkouts` field turns out
to reach us, it settles payments faster and nothing else changes.

**Why this is safe, and was always going to be.** `apply_paid_deposit` claims
the intent with `FOR UPDATE` behind a `status = 'pending'` guard, so any
number of concurrent callers — two polls, a poll and a cron, a poll and a
callback — serialise into exactly one delivery. The original comment on the
status route said fulfilment was safe because there was a single call site.
That was never what made it safe; the database guard is. Removing the
single-call-site rule costs nothing because it was never load-bearing.

The authoritative re-fetch is unchanged and remains the only thing that
decides whether money moved. Polling does not weaken it — polling _is_ it,
called from somewhere else.

## Consequences

- **No callback URL needed.** The conflict with the SCD shop disappears
  rather than being worked around. No relay, no second account, no
  coordination between two systems.
- **Latency is a range, not a point.** Watching the page: as fast as the
  mobile-money operator answers, which is seconds at best and **several
  minutes routinely** — see the correction above; the page is built to wait
  that long rather than assume the good case. Closed tab: up to five minutes
  after that. For a ticket that arrives by email either way, that is
  acceptable; for something needing instant confirmation it would not be.
- **More PawaPay API calls.** Bounded: the sweep skips intents younger than
  90 seconds (the poll is handling those), skips free baskets entirely (they
  never had a deposit), and takes at most 50 per run oldest-first.
- **The cron becomes load-bearing.** It was housekeeping; it is now a
  settlement path. If it stops, payments from closed tabs sit unsettled until
  someone reopens the return page. `CRON_SECRET` missing means the route
  refuses every call — so that variable moves from "should set" to "must set".
- Reconciliation runs _before_ expiry in the same job, so a deposit that
  completed just before the one-hour threshold is delivered rather than
  failed.
- This is not exotic. The SCD shop already carries `reconcile-orders.mjs` for
  the same reason, and its `refreshFromPawapay` does exactly this per-order.

## Alternatives considered

- **A second PawaPay account.** Ruled out by the user: it requires another
  registered company.
- **Routing this app's payments through the SCD Lambda.** It models
  `PRODUCT#`/`ORDER#` in DynamoDB and knows nothing of tiers, attendees,
  badge codes, capacity or the shared account. That is not reusing a pattern,
  it is moving a domain into a system not built for it — and it would still
  need to tell this app what happened, which is the relay again.
- **A relay in front of the shared callback URL.** Already supported
  (`PAWAPAY_SIGNATURE_AUTHORITY`/`PATH`) and still the fallback if instant
  settlement ever matters. Rejected as the default because it makes ticketing
  depend on another application's uptime for no gain over polling.
