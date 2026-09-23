/*
 * Show / hide the navbar's tabs from the dashboard.
 *
 * Same shape as `hero`, `cfs`, `sponsor_call`, `legal`, `capacity` and
 * `memory_lane`: one jsonb column per settings group.
 * `{ "schedule": true, "speakers": true, "faqs": true, "team": true,
 *    "shop": true, "tickets": true }` — `false` hides that tab. The language
 * switch is not in here; it always shows.
 *
 * NULL means "every tab shown" (the repo default), so nothing is seeded, and
 * a key missing from the blob falls back to shown as well — a blob written by
 * an older dashboard can never hide a tab by omission.
 *
 * Deploy-order note: `loadSettings()` selects `*`, so the site reads fine
 * before this runs (every tab simply shows). What needs this column is SAVING
 * a change from Config → Navigation, which fails until it is applied.
 */
alter table public.site_settings
  add column if not exists nav jsonb;

comment on column public.site_settings.nav is
  'Navbar tab visibility: { schedule, speakers, faqs, team, shop, tickets } booleans. Null = all shown. Language switch is always shown.';
