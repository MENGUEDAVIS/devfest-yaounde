-- ============================================================================
-- 0011 — Editorial content, site settings, organiser audit (ADR 0031)
--
-- Accepts the open decision in 0029: a running site cannot write its own
-- JSON files, so the collections the dashboard wants to edit live here.
-- Until a collection has a row, the app still reads src/data/*.json — the
-- files remain the seed and the fallback.
--
-- Writes go through route handlers with the service role. anon/authenticated
-- may READ published content (it is already on the public site) and nothing
-- else. The audit table is organiser-readable so the dashboard can show
-- "who did what" without a new endpoint having to exist first.
-- ============================================================================

-- ------------------------------------------------ editorial_documents ------

create table public.editorial_documents (
  id          text primary key
              check (id in (
                'speakers', 'team', 'sessions', 'sponsors', 'faqs',
                'products', 'ticket-tiers', 'quotes', 'stats', 'past-editions'
              )),
  payload     jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

comment on table public.editorial_documents is
  'One row per public content collection. Payload is the JSON array the site already knows. See ADR 0031.';

alter table public.editorial_documents enable row level security;

-- Public content: anyone can read what is already on the website.
create policy "anyone reads published editorial content"
  on public.editorial_documents for select
  using (true);

-- ------------------------------------------------ site_settings ------------

create table public.site_settings (
  id             text primary key default 'site' check (id = 'site'),
  announcement   jsonb,
  privacy_url    text,
  coc_url        text,
  bevy_url       text,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id)
);

comment on table public.site_settings is
  'The handful of values that change during the event: announcement, legal URLs. Null falls back to the repo.';

alter table public.site_settings enable row level security;

create policy "anyone reads site settings"
  on public.site_settings for select
  using (true);

-- ------------------------------------------------ admin_audit --------------

create table public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid not null references auth.users (id),
  action      text not null,
  target      text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_created_idx on public.admin_audit (created_at desc);
create index admin_audit_actor_idx on public.admin_audit (actor, created_at desc);

comment on table public.admin_audit is
  'Who changed what. Privileged writes (orders, wall, content, discounts, check-in) record a row. G22.';

alter table public.admin_audit enable row level security;

create policy "organisers read the audit log"
  on public.admin_audit for select
  using (public.is_organiser());
