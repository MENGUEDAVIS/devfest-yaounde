/*
 * Memory Lane's "view the full gallery" link becomes admin-editable.
 *
 * Same shape as `hero`, `cfs`, `sponsor_call`, `legal` and `capacity`: one
 * jsonb column per settings group. `{ "galleryUrl": "https://…" }`.
 *
 * NULL means "use the repo default" (`PAST_GALLERY_URL` in
 * src/lib/site-config.ts, last edition's album), so nothing is seeded here —
 * the default already IS the seed, and writing it into the row would give the
 * one URL two homes. An empty string saved from the dashboard hides the link.
 *
 * Deploy-order note: `loadSettings()` selects `*`, so the site reads fine
 * before this runs (the group just falls back). What needs this column is
 * SAVING a changed gallery URL from the dashboard.
 */
alter table public.site_settings
  add column if not exists memory_lane jsonb;

comment on column public.site_settings.memory_lane is
  'Memory Lane section settings: { galleryUrl }. Null = repo default. See ADR 0056.';
