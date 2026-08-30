# 0003 — Payments & Auth Provider

Date: 2026-08-27
Status: Proposed (deliberately left open)

## Context

`PAGES.md` §7–§8 requires a shared login system between Tickets and Shop, and a payment flow led by Mobile Money (MTN/Orange, e.g. via Flutterwave or another Cameroon-focused gateway) with card as secondary. `GETSTARTED_INSTRUCTIONS.md` Step 4 explicitly forbids building real payment integration during the bootstrap and asks for this decision record to stay open until the team decides.

## Decision

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
