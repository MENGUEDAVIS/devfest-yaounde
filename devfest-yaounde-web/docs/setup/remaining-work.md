# What is left

State of the commerce work as of 2026-08-31. Three lists: what blocks a real
sale, what is missing, and what was deliberately not built.

---

## 1. Blocks the first real sale

Nothing here is code. All of it is configuration, and each item fails in a way
that is hard to notice.

| #   | Do this                                                                                     | If you skip it                                                                                                          |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **Register the PawaPay callback**: `https://DOMAIN/api/payments/pawapay/callback`           | Payments succeed, money leaves people's accounts, **nobody ever gets a ticket**. No error anywhere                      |
| 2   | `PAWAPAY_ENV=production` **and** a production token                                         | `AUTHENTICATION_ERROR` with no useful detail                                                                            |
| 3   | `BADGE_CODE_SECRET` set (copy the one already in `.env.local`)                              | Fulfilment throws _after_ payment. PawaPay retries forever, the buyer has paid and has no ticket                        |
| 4   | `APP_BASE_URL` on the real domain                                                           | Nobody returns from the payment page                                                                                    |
| 5   | Supabase → Auth → URL Configuration: Site URL + `https://DOMAIN/auth/callback` allow-listed | Google sign-in fails silently                                                                                           |
| 6   | `CRON_SECRET` set                                                                           | `/api/cron/cleanup` refuses every call; abandoned checkouts keep holding ticket capacity and tiers slowly look sold out |
| 7   | `SUPABASE_SERVICE_ROLE_KEY` + the two `NEXT_PUBLIC_SUPABASE_*`                              | Nothing commerce-related works at all                                                                                   |
| 8   | **Replace the mock ticket tiers and shop products**                                         | You would sell `SONNET` at an invented price with invented perks                                                        |

Item 3 deserves repeating: `BADGE_CODE_SECRET` must be **identical everywhere
and never change**. Every badge code is derived from it, so rotating it
invalidates every ticket already sold.

Full commands in `docs/setup/deployment.md`.

---

## 2. Missing — and who does it

### Frontend (the whole of it)

Every screen for tickets, shop, DP generator, the account dashboard and the
organiser tools. The backend is complete and tested; nothing is written on top
of it. Contracts, request/response shapes and per-flow notes are in
**`docs/guides/frontend-integration.md`**.

The urgent one: **`/{locale}/payments/return`**. The backend sends buyers there
after paying and there is no page behind it — right now they land on a 404
holding a completed payment.

### Backend — small, real gaps

- **Card payments.** `PAGES.md` §7 wants card as a secondary option. This is
  Mobile Money only. Whether PawaPay covers cards or a second gateway is needed
  has not been investigated.
- **Refunds.** Cancelling an order moves no money. Refunding is manual in the
  PawaPay dashboard, and `amount_mismatch` intents need a human either way.
- **Per-edition capacity.** Ticket counts span every edition, so reusing a tier
  id next year would count this year's sales against it. Fine for 2026, a bug
  for 2027 — noted in ADR 0016.
- **Email provider not chosen.** Templates and dispatch are done and bilingual;
  Resend is wired as the one concrete adapter. Without `RESEND_API_KEY` nothing
  sends, the payment still completes, and `payment_events` records
  `receipt_skipped`. Swapping providers is one file.
- **No offline mode for check-in.** The scanner needs a connection. If the
  venue Wi-Fi is unreliable, that needs planning before the day.

### Content

Everything in `src/data/` is placeholder — speakers, sessions, team, sponsors,
and now ticket tiers and shop products. The tier names (`HAIKYU`, `SONNET`,
`OPUS`), prices and perks are **invented mock data**. Only the shape comes from
`PAGES.md` §7. See `docs/guides/updating-tickets-and-shop.md`.

---

## 3. Deliberately not built

Not oversights — decisions, each with a record.

- **No public gallery of generated DPs.** Would reintroduce uploads, EXIF
  stripping, storage and retention. Reversing that is a new decision record,
  not a feature (ADR 0015).
- **No second sign-in method.** Google only: a second provider splits accounts,
  so someone signing in differently next year would have two accounts and half
  their tickets (ADR 0014).
- **No admin UI for discount codes.** They are rows in `discount_codes`, managed
  in the Supabase dashboard. Who issues them is still an open question
  (`PAGES.md` §11).
- **No morphed photo frames in the DP generator.** DESIGN.md §4.2 forbids
  faking the signature shape until the real asset is supplied.
- **Secrets are not mirrored from GitHub to Vercel.** Runtime secrets live in
  Vercel because that is where they are read; GitHub Secrets only reach a
  workflow runner. Reasoning in `docs/setup/deployment.md`.

---

## 4. Verification

```bash
npm run verify   # lint + typecheck + 41 tests
npm run build
```

CI runs the same on every push and pull request, with no secrets.

What the tests do **not** cover, and cannot: the capacity and discount
reservations. They guard against concurrency, and an in-process test removes
exactly the thing they defend against. Both were verified against the live
database instead — 40 seats reserved and the 41st refused, a single-use code
accepted once and refused the second time. Redo that check against a fresh
database rather than trusting the unit suite (ADR 0016).
