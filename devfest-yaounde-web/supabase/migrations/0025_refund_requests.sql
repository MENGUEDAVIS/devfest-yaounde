-- ============================================================================
-- 0025 — A lightweight tracker for manual refund/exchange requests (PHASE22 §D)
--
-- NOT a money-moving system. Tickets stay non-refundable, and shop exchanges
-- stay handled manually, off-platform (docs/content/refund-policy.md) — that
-- policy is unchanged. What was missing was anywhere to SEE those requests
-- land: today they exist only as emails to gdgyaounde@gmail.com, with
-- nothing tracking whether one from three weeks ago ever got answered.
--
-- Consent recording itself was already solved before this phase, by ADR
-- 0022 (`payment_intents.terms_accepted_at` / `.terms_text`) — this table is
-- purely the operational half PHASE22 §D was actually missing.
-- ============================================================================

create table public.refund_requests (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('tickets', 'shop')),
  -- Free text on purpose: a badge code, a deposit id, an order id, or
  -- whatever the person who emailed in actually gave. Requiring a real FK
  -- would refuse to record a request just because the organiser hasn't
  -- looked the order up yet.
  reference        text not null,
  requester_name   text not null,
  requester_email  text not null,
  reason           text not null,
  status           text not null default 'requested'
                     check (status in ('requested', 'in_progress', 'resolved', 'denied')),
  notes            text,
  created_by       uuid not null references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index refund_requests_status_idx
  on public.refund_requests (status, created_at desc);

comment on table public.refund_requests is
  'Manual refund/exchange requests an organiser logged from email or support — a visibility tracker, not a money-moving system. Actual refunds/exchanges stay manual per docs/content/refund-policy.md. PHASE22 §D.';

alter table public.refund_requests enable row level security;

-- Same shape as admin_audit (0011): organisers read through their own
-- session; every write goes through an API route on the service role, which
-- does its own organiser check and its own audit log entry. No insert/
-- update/delete policy is needed for that reason — none is added.
create policy "organisers read refund requests"
  on public.refund_requests for select
  using (public.is_organiser());

comment on table public.admin_audit is
  'Who changed what. Privileged writes (orders, wall, content, discounts, check-in, refund requests) record a row. G22.';
