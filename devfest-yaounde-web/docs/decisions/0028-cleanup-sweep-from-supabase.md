# 0028 — The five-minute sweep is triggered from Supabase, not Vercel Cron

Date: 2026-09-03
Status: Accepted — amends `0019` (who invokes the sweep, not how settlement works)

## Context

`0019` made `/api/cron/cleanup` a settlement path: the return page settles
anyone watching, and a five-minute sweep catches the closed tab. The job
itself lives on Vercel because that is where the PawaPay client, the badge
secret and the guarded delivery already run.

The schedule was declared in `vercel.json` as `*/5 * * * *`. That expression
is illegal on Vercel's Hobby plan — Hobby cron jobs may run **once per day**,
and a more frequent expression fails the deploy. This project is on Hobby.

The job cannot move into SQL. Reconciling a deposit means calling PawaPay
and then `apply_paid_deposit`; those live in the Next.js app on purpose.
What has to change is only **who knocks on the door**.

## Decision

**Keep the route. Change the scheduler.**

Supabase `pg_cron` (every five minutes) + `pg_net` HTTP GET
`{app-base-url}/api/cron/cleanup` with `Authorization: Bearer {cron-secret}`.
Both values are read at runtime from Vault (`app-base-url`, `cron-secret`) —
the same store as the PawaPay token (ADR 0018) — so the migration contains
no secrets and no domain.

The Vercel Cron entry stays, but only as a **Hobby-legal daily backstop**
(`0 4 * * *`). Two callers of an idempotent job is fine; zero callers is
how tickets vanish. If pg_cron is quiet (Vault not filled yet, or a paused
free project), the daily Vercel hit still runs the sweep and, as a side
effect, wakes a paused Supabase project.

Auth is unchanged: the route still refuses anything that is not
`Bearer $CRON_SECRET`. pg_cron is just another caller with that header.

## Consequences

- **A Hobby deploy no longer fails** on the cron expression.
- Closed-tab settlement stays "within five minutes" as `0019` promised,
  provided the two Vault secrets exist. Missing them is silent — the job
  logs a warning and skips, rather than inserting a URL into the migration.
- `pg_net` is async and the default timeout is 2 seconds, which would
  cancel the request while Vercel is still working. The caller sets
  `timeout_milliseconds` to 15 000. Hobby Functions themselves cap at 10 s;
  a run that times out is retried next pass, oldest-first, so it catches up.
- Free-tier Supabase **pauses after 7 days of inactivity**, and pg_cron
  pauses with it. During ticket sales the database is not idle. After the
  event, the daily Vercel cron is the one that still fires.
- Inspecting a missed sweep is a SQL question, not a Vercel dashboard
  question: `cron.job_run_details` and `net._http_response`.
