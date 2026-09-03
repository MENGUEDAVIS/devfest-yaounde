# Documentation

Start from what you are trying to do.

| I want to…                                         | Read                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Build the ticket / shop / DP generator screens** | [`guides/frontend-integration.md`](guides/frontend-integration.md) — every endpoint, request and response shape                |
| **Know what is left to do**                        | [`setup/remaining-work.md`](setup/remaining-work.md) — what blocks a real sale, what is missing, what was deliberately skipped |
| **Deploy, or set an environment variable**         | [`setup/deployment.md`](setup/deployment.md) — which secret lives where, and why                                               |
| **Run the site locally**                           | [`setup/local-development.md`](setup/local-development.md)                                                                     |
| **Understand or debug payments**                   | [`guides/payments-runbook.md`](guides/payments-runbook.md) — how a payment settles, and what to do when one looks wrong        |
| **Change ticket prices, tiers or shop products**   | [`guides/updating-tickets-and-shop.md`](guides/updating-tickets-and-shop.md) — file edits, no developer needed                 |
| **Change speakers, sessions, FAQs, team**          | [`guides/updating-content.md`](guides/updating-content.md)                                                                     |
| **Change the DP generator's frames**               | [`guides/dp-generator.md`](guides/dp-generator.md) — the frame catalog, and why it has no backend                              |
| **Fix how a link previews, or a search result**    | [`guides/seo.md`](guides/seo.md) — metadata, hreflang, the social image, structured data                                       |
| **Scan a badge, or move an order along**           | [`guides/check-in-and-orders.md`](guides/check-in-and-orders.md)                                                               |
| **Get into the admin dashboard**                   | [`guides/admin-dashboard.md`](guides/admin-dashboard.md) — the URL, the env vars, and the `organisers` row                     |
| **Know how something should look or move**         | [`design/DESIGN.md`](design/DESIGN.md), [`content/PAGES.md`](content/PAGES.md)                                                 |
| **Check a release**                                | [`setup/security-checklist.md`](setup/security-checklist.md)                                                                   |

---

## The five things worth knowing before touching payments

1. **Prices never come from the client.** Every total is recomputed
   server-side from `src/data/*.json` by id. A `priceXAF` in a request body is
   ignored.
2. **We ask PawaPay; we are never told.** There is no callback in this flow —
   settlement happens by polling and by a five-minute sweep. `CRON_SECRET` is
   therefore load-bearing, not optional.
3. **Delivery is one guarded transaction.** `apply_paid_deposit` claims the
   intent `FOR UPDATE` behind a `status = 'pending'` guard, so any number of
   concurrent callers deliver exactly once.
4. **Access control lives in the database.** RLS scopes every read to
   `auth.uid()`. Hiding a button is not access control.
5. **`BADGE_CODE_SECRET` must never change.** Every badge code derives from
   it; rotating it invalidates every ticket already sold.

---

## Decision records

Numbered, never reused. Read the newest on a topic first — several supersede
or amend an earlier one.

**Payments and commerce**

| #                                                        | Subject                          | Status                                   |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| [0003](decisions/0003-payments-and-auth.md)              | Payments & auth provider         | Superseded by 0013 / 0014                |
| [0013](decisions/0013-payments-pawapay.md)               | PawaPay, Mobile Money            | Accepted, **amended by 0019**            |
| [0014](decisions/0014-persistence-and-auth-supabase.md)  | Supabase, Google-only sign-in    | Accepted                                 |
| [0016](decisions/0016-capacity-reservations.md)          | Capacity & discount reservations | Accepted                                 |
| [0017](decisions/0017-pawapay-token-from-ssm.md)         | Token from AWS SSM               | Accepted, **not the default — see 0018** |
| [0018](decisions/0018-secrets-in-supabase-vault.md)      | Supabase Vault as secret store   | Accepted — **current default**           |
| [0019](decisions/0019-settle-by-polling-not-callback.md) | Settle by polling, not callback  | Accepted — **current model**             |

**Site and design**

[0001](decisions/0001-initial-scaffold.md) archive & clean start ·
[0002](decisions/0002-tech-stack.md) tech stack ·
[0004](decisions/0004-font-loading.md) fonts ·
[0005](decisions/0005-base-color-theme.md) base theme ·
[0006](decisions/0006-logo-assets.md) logo ·
[0007](decisions/0007-smooth-scroll.md) smooth scroll ·
[0008](decisions/0008-retire-bevy-rsvp.md) Bevy RSVP retired ·
[0009](decisions/0009-speaker-interaction.md) speaker interaction ·
[0010](decisions/0010-team-grouping.md) team grouping ·
[0011](decisions/0011-runtime-theming.md) runtime theming ·
[0012](decisions/0012-overlay-reuse.md) overlay reuse ·
[0015](decisions/0015-dp-generator-client-side.md) DP generator is client-side

---

## Writing docs here

Covered by `.claude/skills/devfest-docs-workflow`. Short version: an
architectural choice gets a numbered decision record; a feature a future
organiser has to operate gets a guide written for them, not for a developer.

When a record stops being true, **annotate it — do not rewrite it**. The point
of a decision record is that it says what was decided and why _at the time_.
Add a `Superseded by` / `Amended by` line at the top and strike the specific
claims that changed, as `0013` and `0017` do.
