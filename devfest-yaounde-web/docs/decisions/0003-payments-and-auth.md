# 0003 — Payments & Auth Provider

Date: 2026-08-27
Status: Superseded by 0013 (payments) and 0014 (persistence & auth)

## Context

`PAGES.md` §7–§8 requires a shared login system between Tickets and Shop, and a payment flow led by Mobile Money (MTN/Orange, e.g. via Flutterwave or another Cameroon-focused gateway) with card as secondary. `GETSTARTED_INSTRUCTIONS.md` Step 4 explicitly forbids building real payment integration during the bootstrap and asks for this decision record to stay open until the team decides.

## Decision

**Resolved on 2026-08-31, in two records rather than one:**

- Payments → `0013-payments-pawapay.md` (PawaPay, Mobile Money, hosted
  Payment Page + verified asynchronous callback).
- Persistence and auth → `0014-persistence-and-auth-supabase.md` (Supabase
  Postgres with RLS; Google OAuth; hosted on Vercel).

The open questions below are answered where they were answered, and left
listed where they are still open — see the closing note.

The original text is kept for context:

Not yet decided. This record exists as a placeholder so the open question is tracked instead of silently resolved. During bootstrap, `/tickets` and `/shop` get placeholder routes only — no real checkout, no real auth provider wired in.

## Open questions to resolve before `feat/auth-shared-account`, `feat/tickets-flow`, or `feat/shop-flow` start

- **Auth provider**: e.g. NextAuth/Auth.js with a Cameroon-appropriate identity flow (email/password, magic link, phone-based OTP?), vs. a third-party auth service. Needs to support one shared account across Tickets + Shop (`PAGES.md` §10.1).
- **Payment gateway**: Flutterwave vs. alternatives with strong MTN/Orange Mobile Money support in Cameroon. Card support as secondary.
- **Ticket check-in**: what generates/validates the QR/badge codes at the door, and whether a companion scanning tool is needed (flagged in `PAGES.md` §11).
- **Discount codes**: who issues/manages them, and whether a lightweight admin view is needed (flagged in `PAGES.md` §11).
- **Shop fulfillment**: pre-order cutoffs, pickup-at-venue vs. shipping, post-event sale handling (flagged in `PAGES.md` §11).

## Consequences

- `feat/auth-shared-account`, `feat/tickets-flow`, and `feat/shop-flow` (Step 5 build order) are blocked on this decision being made explicitly — they should not start with an implicit/default provider choice.
- Until resolved, any UI built for these flows should be built against stubbed/mock data and clearly marked as non-functional for real transactions.

---

## Closing note (2026-08-31)

Resolved by 0013 / 0014: the auth provider, the payment gateway, and the
persistence layer. `feat/auth-shared-account`, `feat/tickets-flow` and
`feat/shop-flow` are unblocked; their backend is implemented.

**Still open, and still tracked here:**

- **Ticket check-in.** Resolved for the backend: `POST /api/check-in`, gated
  on the `organisers` table (`docs/guides/check-in-and-orders.md`). No scanning
  interface exists.
- **Discount codes.** Rows in `discount_codes`, managed by hand in the
  Supabase dashboard. No admin view, and no decision on who issues them.
- **Shop fulfilment.** Transitions are implemented and enforced
  (`PATCH /api/orders/:id/status`). Pre-order cutoffs and pickup-vs-shipping
  remain undecided, which is why `fulfilment` stays free-form.
- **Card payments.** `PAGES.md` §7 wants card as a secondary option; this
  integration is Mobile Money only.
- **Receipt emails.** Templates and dispatch are implemented, bilingual, sent
  exactly once. The provider is still not _chosen_: Resend is wired as the one
  concrete adapter and the feature degrades to a logged no-op without a key.
