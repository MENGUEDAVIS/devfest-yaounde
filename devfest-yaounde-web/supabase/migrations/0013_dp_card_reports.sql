-- ============================================================================
-- 0013 — Visitor reports on community-wall cards (G21, ADR 0033)
--
-- Auto-approval (ADR 0027) moved protection from before publication to after
-- it. "After" only works if someone can raise a hand. These rows are that
-- hand: no account, rate-limited by IP, one report per address per card.
-- Organisers read them from the dashboard and reject through the existing
-- PATCH — rejection still deletes the image.
-- ============================================================================

create table public.dp_card_reports (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.dp_cards (id) on delete cascade,
  created_at  timestamptz not null default now(),
  reporter_ip inet
);

create unique index dp_card_reports_once_per_ip
  on public.dp_card_reports (card_id, reporter_ip)
  where reporter_ip is not null;

create index dp_card_reports_created_idx
  on public.dp_card_reports (created_at desc);

alter table public.dp_card_reports enable row level security;

-- Same posture as dp_cards: anon inserts nothing. The route uses the service
-- role. Organisers can read the queue in the dashboard.
create policy "organisers read wall reports"
  on public.dp_card_reports for select
  using (public.is_organiser());

comment on table public.dp_card_reports is
  'Visitor reports on community-wall cards. See GAPS.md G21 and ADR 0033.';
