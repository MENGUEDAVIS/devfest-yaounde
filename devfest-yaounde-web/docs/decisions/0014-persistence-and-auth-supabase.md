# 0014 — Supabase for persistence, OAuth for the shared account

Date: 2026-08-31
Status: Accepted — resolves the auth/persistence half of `0003-payments-and-auth.md`

## Context

`0002-tech-stack.md` chose structured JSON for content and explicitly deferred
anything needing a database. `0013` then made a database unavoidable: the
PawaPay model requires a payment intent persisted _before_ the buyer is
redirected, and `PAGES.md` §10.1 requires one account shared between Tickets
and Shop with a `/account` dashboard.

Content stays in JSON. What needs a database is only the things that did not
exist at build time: intents, tickets, orders, discount codes, accounts.

## Decision

**Supabase** (hosted Postgres + Auth + Row Level Security), on **Vercel**.

**Auth is Google OAuth, and nothing else.** No password to hash, reset or
rate-limit, and no SMS provider to pay for. GitHub was considered alongside it
and deliberately dropped: a second provider is a second thing to keep
configured, and it splits accounts — someone who signs in with GitHub one year
and Google the next has two accounts and only half their tickets.

**Access control is enforced by the database, not by route code.** RLS is on
for every table, deny-by-default, and read policies are scoped to
`auth.uid()`. Two clients, and the distinction is the whole security model:

| Client                   | Key          | RLS          | Used for                                    |
| ------------------------ | ------------ | ------------ | ------------------------------------------- |
| `createServerSupabase()` | anon         | **applies**  | reading anything belonging to a user        |
| `createAdminSupabase()`  | service role | **bypassed** | intents, fulfilment, discount codes, limits |

There is deliberately **no client INSERT/UPDATE policy on any money table**.
Every write goes through a route handler.

**Rate limiting is counted in Postgres** (`bump_rate_limit`), not in process
memory. On Vercel each function instance has its own memory, so an in-process
counter caps nothing once traffic spreads across instances.

**`/auth/callback` lives outside the `[locale]` segment**, and `auth` is
excluded from the proxy matcher. The OAuth redirect URI is registered once with
each provider and must not pick up a `/fr` prefix depending on where the
person was browsing. The locale rides in a query parameter instead. The proxy
now also refreshes the Supabase session cookie, because a Server Component
cannot write cookies and so cannot refresh an expired token itself.

## Consequences

- Two sources of truth by design: **catalog and copy in JSON** (a file edit, no
  developer needed, per `docs/guides/updating-content.md`), **transactions in
  Postgres**. Prices live in JSON and are recomputed server-side at checkout;
  a price is never read from a request body.
- **Google-only excludes anyone without a Google account.** This was raised
  before the choice was made and confirmed afterwards. It is cheap to revisit:
  Supabase email OTP is a dashboard toggle plus one screen, and the schema
  already keys everything off `auth.users`, so no migration is needed. Worth
  watching if non-developer attendees report trouble signing in.
- Nothing in the code names a provider. `/auth/callback` exchanges whatever
  code Supabase hands back, so adding or swapping a provider later is a
  dashboard change, not a deploy.
- The service-role key can read and write everything. It must never be
  prefixed `NEXT_PUBLIC_`, never imported into a client component. Every module
  that touches it is marked `server-only`, so a stray import fails the build
  rather than shipping the key to a browser.
- Supabase's free tier pauses a project after a week of inactivity. For an
  event site that is quiet between editions, that is a real operational risk —
  see the runbook.
- Migrations are plain SQL under `supabase/migrations/`, applied by hand
  through the dashboard or the Supabase CLI. No ORM and no migration runner
  was introduced; if the schema starts changing often, that is a decision worth
  revisiting.

## Alternatives considered

- **Neon + Drizzle**: a better typed-schema story, but auth would still need
  wiring separately, and RLS-as-access-control is exactly what stops A01 bugs
  from being possible in the first place.
- **Firebase/Firestore**: ecosystem-appropriate for a GDG event, but the
  idempotent fulfilment step wants a real transaction with a conditional
  update, which Postgres gives directly.
- **In-memory rate limiting**: simpler, and wrong on serverless.
