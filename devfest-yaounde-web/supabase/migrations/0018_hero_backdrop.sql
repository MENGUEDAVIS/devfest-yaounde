-- ============================================================================
-- 0018 — The hero's background photograph (ADR 0047)
--
-- One image, chosen in the dashboard, sitting under the whole landing hero.
-- It was previously whatever happened to be first in `past-editions`, which
-- meant the front page's backdrop changed whenever somebody reordered the
-- Memory Lane gallery — a surprising coupling between two unrelated screens.
--
-- jsonb rather than a `hero_image_url` column for the same reason as `cfs`
-- and `legal` in 0016: it is one cohesive setting, read and written together,
-- and it will grow a second field (a focal point, an alt line) before it
-- grows a second column.
-- ============================================================================

alter table public.site_settings
  add column if not exists hero jsonb;

comment on column public.site_settings.hero is
  'Landing hero backdrop: { imageUrl }. Stored as WebP so transparency survives — the themed background shows through it on purpose (ADR 0047).';
