# Getting into the admin dashboard

**The URL is `/en/admin`** (or `/fr/admin` — the dashboard itself is English
either way). Plain `/admin` redirects to the default locale and lands in the
same place.

**A 404 is the correct and only refusal.** There is no "access denied" screen,
on purpose: a 403 would confirm the route exists to anyone typing URLs. So a
404 means one of exactly three things, and this page is the order to check
them in.

---

## 1. Is Supabase configured at all?

Without it the page cannot even ask who you are. Locally you need a
`.env.local` — copy `.env.example` and fill in at least these three:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key>"
```

Both are in the Supabase dashboard under **Project Settings → API**.

- The **anon** key is public and safe in the browser.
- The **service role** key bypasses RLS entirely. It is server-only, must
  never appear in a `NEXT_PUBLIC_` variable, and must not be committed.

If these are missing the page returns a **500**, not a 404, and the server log
says `NEXT_PUBLIC_SUPABASE_URL is not set`. That is a different problem from
the one this guide is mostly about.

You do not need any other variable for the dashboard. `NEXT_PUBLIC_DP_GALLERY`
only affects whether the wall panel shows counts or an explanation.

## 2. Are you signed in?

The dashboard reads a Supabase session cookie. There is no login form on the
admin route — it is not a separate account system.

**Sign in at `/en/account` with Google first**, then go to `/en/admin`. If you
have never signed into the site with the Google account you are about to make
an organiser, do that now: the row in step 3 needs a user id that only exists
once you have signed in at least once.

## 3. Are you in the `organisers` table?

This is the usual answer. Being signed in is not enough — the site has one
account system, and organiser rights are a separate row.

In the Supabase SQL editor:

```sql
-- Who am I? (use the email you signed in with)
select id, email from auth.users where email = 'you@example.com';

-- Make that person an organiser
insert into organisers (user_id, note)
values ('<the id from above>', 'Joel — set up 2026-09-03');

-- Check it took
select o.user_id, u.email, o.added_at, o.note
from organisers o join auth.users u on u.id = o.user_id;
```

Then reload `/en/admin`. No deploy, no restart — the check is a live query, so
adding a volunteer on the morning of the event is one row.

**To remove someone**, delete their row. Access stops on their next request.

---

## Why it is a table and not an env var

An allowlist in the environment would mean a redeploy to add a volunteer at
the venue, and it would mean the list lived in two places once you had more
than one environment. A row is checked live, is auditable in the database, and
carries a `note` so a year later you can tell why someone has access.

## What the gate actually does

`currentOrganiser()` in `src/lib/security/organisers.ts`:

1. Resolves the Supabase session **on the server** — a cookie a browser cannot
   forge without the signing secret.
2. Looks up `organisers` **through the service role**, because the table is
   only readable by organisers; asking through your own session would return
   an empty table and give the right answer by accident rather than by check.
3. **Fails closed.** A database error returns "not an organiser", never the
   benefit of the doubt.

The same function guards check-in, order status and the wall's moderation
queue. There is no client-side flag anywhere — nothing to flip in devtools.

## Once you are in

The dashboard is one page with a sidebar; views swap without a page load.
What is real, what is read-only and why is in
[`docs/backend/ADMIN-CAPABILITIES.md`](../backend/ADMIN-CAPABILITIES.md). The
short version:

- **Real:** metrics, tickets, transactions, orders, discount codes, users,
  wall status, CSV export.
- **The one write:** moving a shop order along.
- **Read-only:** everything editorial (speakers, sessions, team, sponsors,
  FAQs, products, tiers), the announcement message, and the config URLs —
  they live in files in the repo, and a running site cannot write to its own
  source. See ADR 0029.

## Still 404 after all three?

- Check you are on the right **project** — a `.env.local` pointing at a
  different Supabase project than the one you added the row to will fail
  silently and look identical.
- Check the row's `user_id` matches `auth.users.id`, not `profiles.id` from a
  different environment.
- Look at the server log. A failed membership lookup is printed as
  `[organisers] membership lookup failed`.
