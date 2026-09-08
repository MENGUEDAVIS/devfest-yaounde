# What is left

State of the commerce work as of 2026-08-31. Three lists: what blocks a real
sale, what is missing, and what was deliberately not built.

---

## 1. Blocks the first real sale

Nothing here is code. All of it is configuration, and each item fails in a way
that is hard to notice.

| #   | Do this                                                                                                                                                                                                                                                                                               | If you skip it                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | **`CRON_SECRET` on Vercel, plus Vault secrets `app-base-url` and `cron-secret` (same values), and migration 0010 applied.** The five-minute sweep is Supabase `pg_cron` (ADR 0028) — Hobby cannot run Vercel Cron more than once a day. Confirm a row in `cron.job` and a 200 in `net._http_response` | Anyone who closes the tab after paying never gets their ticket, and their seats stay reserved    |
| 1b  | _Optional:_ point the PawaPay **Checkouts** callback at `https://DOMAIN/api/payments/pawapay/callback`. Only an optimisation — settlement becomes instant instead of within five minutes                                                                                                              | Nothing breaks; payments settle a little later                                                   |
| 2   | `PAWAPAY_ENV=production` **and** a production token                                                                                                                                                                                                                                                   | `AUTHENTICATION_ERROR` with no useful detail                                                     |
| 3   | `BADGE_CODE_SECRET` set (copy the one already in `.env.local`)                                                                                                                                                                                                                                        | Fulfilment throws _after_ payment. PawaPay retries forever, the buyer has paid and has no ticket |
| 4   | `APP_BASE_URL` on the real **public HTTPS** domain. Verified 2026-09-03 by a live 100 XAF payment: PawaPay rejects a `localhost` returnUrl outright with `INVALID_PARAMETER`, so the payment page is **never created at all**                                                                         | Nobody returns from the payment page                                                             |
| 5   | Supabase → Auth → URL Configuration: Site URL + `https://DOMAIN/auth/callback` allow-listed                                                                                                                                                                                                           | Google sign-in fails silently                                                                    |
| 6   | `SUPABASE_SERVICE_ROLE_KEY` + the two `NEXT_PUBLIC_SUPABASE_*`                                                                                                                                                                                                                                        | Nothing commerce-related works at all                                                            |
| 7   | **Replace the mock ticket tiers and shop products**                                                                                                                                                                                                                                                   | You would sell `SONNET` at an invented price with invented perks                                 |

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

### Backend — what is left, and it is not code

Everything that was a backend gap has been built and verified against the live
project: capacity and variant reservations, the consent record, buyer-set
fulfilment, ticket ownership, and the community wall. What remains needs a
decision, a key or a person.

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

**Team is real.** Ten organisers from the chapter's own listing, with their
GDG position, socials and Bevy profiles; Cyprien Tankeu is marked `alumni`
(ADR 0038). Their **photographs are deliberately empty** — they could not be
pulled from the listing, and the cards show initials until somebody uploads
them through the dashboard.

**Speakers, sessions and sponsors are empty**, not placeholder. The call for
speakers is open, no schedule is published and no sponsor has signed, so the
invented people and companies are gone rather than shipping as if real.

**Ticket tiers and shop products are still invented mock data.** The tier
names (`HAIKYU`, `SONNET`, `OPUS`), prices and perks come from nobody — only
the shape comes from `PAGES.md` §7. See
`docs/guides/updating-tickets-and-shop.md`.

**The dates are confirmed; the venue is not.** `EVENT_DATES` in
`src/lib/calendar.ts` holds **21 and 28 November 2026** — two Saturdays a week
apart, confirmed by the organisers on 2026-09-08 (ADR 0038). That list is what
reveals the add-to-calendar buttons, fills the hero's dates, and switches on
the `Event` structured data. **Add a day by adding a date to the array** — the
day count derives from its length, and nothing infers a date by counting
forward, which is what previously put day 2 on the wrong Saturday.

The venue is still unset. It lives in `src/lib/event.ts` (`venue`,
`venueStreet`) and turns the `Place` in the rich result from a city into an
address.

---

## 3. Deliberately not built

Not oversights — decisions, each with a record.

- **No public gallery of generated DPs.** Would reintroduce uploads, EXIF
  stripping, storage and retention. Reversing that is a new decision record,
  not a feature (ADR 0015).
- **No second sign-in method.** Google only: a second provider splits accounts,
  so someone signing in differently next year would have two accounts and half
  their tickets (ADR 0014).
- **Discount codes are created in `/admin`.** The table was always there;
  the write endpoint is ADR 0031. Who is allowed to issue them is still an
  organiser-row question (`PAGES.md` §11).
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

CI is meant to run the same on every push and pull request, with no secrets —
but **Actions cannot currently start on this repository** (`startup_failure`,
no logs, reproduced with a hello-world workflow). It is a billing or
spending-limit condition on the private repo, not the workflow files. Until it
is fixed, `npm run verify` locally is the only gate. See
`docs/setup/deployment.md`.

What the tests do **not** cover, and cannot: the capacity and discount
reservations. They guard against concurrency, and an in-process test removes
exactly the thing they defend against. Both were verified against the live
database instead — 40 seats reserved and the 41st refused, a single-use code
accepted once and refused the second time. Redo that check against a fresh
database rather than trusting the unit suite (ADR 0016).
