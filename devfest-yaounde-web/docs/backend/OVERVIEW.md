# The commerce backend, from the frontend's side

**Verified against the code on 2026-08-31**, at `6be72fc`, after syncing the
fork with `upstream/main`.

## Read this first, then stop reading this

The backend author already wrote the integration contract, and it is accurate.
**`docs/guides/frontend-integration.md` is the source of truth** for request
and response shapes — this file does not restate it.

What this file adds is the part a contract can't tell you: **which claims were
checked, how, and what the answer was.** A contract describes intent; this
records what the code actually does today, so the UI is built against reality
rather than against a document.

| Document                              | What it is for                              |
| ------------------------------------- | ------------------------------------------- |
| `docs/guides/frontend-integration.md` | The API contract. Build against this.       |
| `docs/setup/remaining-work.md`        | The author's own honest list of what's left |
| `docs/setup/deployment.md`            | Config needed before a real sale            |
| `docs/guides/payments-runbook.md`     | Operating payments                          |
| **`docs/backend/GAPS.md`**            | **Per-screen: wired vs blocked**            |
| ADRs `0013`–`0019`                    | Why payments/auth/DP are built as they are  |

## What exists

**Stack added:** Supabase (Postgres + Auth + Vault), PawaPay for Mobile Money,
Zod for request validation, Resend as the one concrete email adapter.

**API surface** — 12 route handlers, all confirmed present and building:

| Route                                 | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `POST /api/checkout/tickets`          | Price, reserve capacity, open payment    |
| `POST /api/checkout/shop`             | Same, for product line items             |
| `GET  /api/payments/status`           | Poll settlement — **issues the tickets** |
| `POST /api/payments/pawapay/callback` | Provider callback (secondary path)       |
| `GET  /api/account/profile`           | Who is signed in + `isOrganiser`         |
| `GET  /api/account/tickets`           | The signed-in person's tickets           |
| `GET  /api/account/orders`            | Their orders, with items                 |
| `POST /api/check-in`                  | Organiser: scan a badge code             |
| `PATCH /api/orders/[id]/status`       | Organiser: fulfilment status             |
| `GET  /api/cron/cleanup`              | Releases abandoned capacity              |
| `GET  /auth/callback`                 | OAuth return                             |
| `POST /auth/signout`                  | Sign out (POST, deliberately)            |

**Database:** four migrations under `supabase/migrations/` — commerce tables,
capacity/check-in lifecycle, a discount-code guard, and Vault secrets.

## What was verified, and how

| Claim                                           | Method                                 | Result                                            |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Repo builds, typechecks, lints after the merge  | `tsc --noEmit`, `eslint`, `next build` | Clean                                             |
| Test suite passes                               | `npm test`                             | **55/55 pass**                                    |
| `ticket-tiers.json` / `products.json` exist     | Read + parsed                          | Yes — 3 tiers, 5 products                         |
| Product statuses are the four documented        | Parsed distinct values                 | `in-stock`, `pre-order`, `sold-out`, `venue-only` |
| Error copy exists in **both** locales           | Key-set diff fr↔en                     | 229 keys, **zero drift**                          |
| `errors.checkout.*` covers the documented codes | Key listing                            | 18 codes, all present both locales                |
| `errors.payment.*` / `errors.dp.*`              | Key listing                            | 5 and 6 codes, both locales                       |
| Request shapes match the guide                  | Read `src/lib/payments/schemas.ts`     | Match                                             |

**One discrepancy found:** `shopCheckoutSchema` also accepts `discountCode`.
The guide's shop example omits it. The schema is the authority — the shop
checkout can take a code, so the UI should offer one.

**Limits worth designing to** (from the schemas, not the prose): attendees
1–10 per order; cart 1–20 lines, 1–10 each; attendee name 2–80 chars;
phone strictly `237XXXXXXXXX`; discount code 3–32 of `[A-Z0-9-]`.

## The three rules that shape every screen

Restated because breaking one is a security bug, not a UI bug:

1. **Never send a price.** Totals are recomputed server-side by id. A
   `priceXAF` in a body is ignored. Display prices from the JSON; trust the
   server's `quote` for what was charged.
2. **Returning from the payment page is not proof of payment.** Poll
   `/api/payments/status`. The tab can be closed or reopened by someone else.
3. **Errors are `code`s, not sentences.** Map through `errors.checkout.*` /
   `errors.payment.*`, which are already bilingual.

## Running it locally

`.env.example` is complete and commented. Copy to `.env.local` and fill in.
Without Supabase keys nothing commerce-related works; without a PawaPay token
checkout reaches the payment step and stops. `docs/setup/local-development.md`
covers the rest.

Verification gate, since CI cannot currently start on the repo (a billing
condition, documented in `docs/setup/deployment.md`):

```bash
npm run verify   # lint + typecheck + tests
npm run build
```
