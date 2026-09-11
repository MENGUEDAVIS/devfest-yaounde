-- ============================================================================
-- 0020 — Overall ticket capacity, as its own admin-set figure (Phase 20 / A6)
--
-- Independent of the per-tier `quantityAvailable` caps already enforced at
-- checkout (see 0002's create_payment_intent). This is a display/admin
-- number only: "how many tickets total, across every tier, do we want to
-- sell for this edition" — shown publicly as a live remaining count. The
-- dashboard warns an admin if the sum of tier caps exceeds this total, but
-- neither figure enforces the other server-side; checkout keeps gating on
-- the per-tier reservation it already had.
--
-- jsonb rather than a plain integer column for the same reason as `hero`/
-- `cfs`/`legal`: one cohesive setting, room to grow (e.g. a per-day split)
-- without another migration.
-- ============================================================================

alter table public.site_settings
  add column if not exists capacity jsonb;

comment on column public.site_settings.capacity is
  'Overall event capacity for the public counter: { total }. Independent of ticket_tiers.quantityAvailable — see docs/decisions on ticket capacity vs tier caps (Phase 20).';
