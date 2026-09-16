-- ============================================================================
-- 0024 — Self-service ticket claim (PHASE22 §C)
--
-- A ticket bought for someone else (`is_self = false`) already names them —
-- `attendee_name`/`attendee_email` — but `tickets.user_id` still says who
-- PAID, so the attendee themselves has no account access to it: they cannot
-- see it under /account, and cannot check in with it under their own name.
-- Content already promised this ("they can claim it into their own account
-- to manage and check in with it themselves" — faqs.json, PHASE22 §B2).
--
-- `claimed_at` records when that happened, purely for audit/idempotency —
-- the actual capability token is a keyed HMAC of the ticket's own id
-- (src/lib/security/claim-token.ts), verified in application code before
-- this function is ever called, the same split badge codes already use
-- (secret-derived verification in TS, the row mutation in a SECURITY
-- DEFINER function). No token value is stored in the database: there is
-- nothing here for a leaked backup or a curious admin to read.
-- ============================================================================

alter table public.tickets
  add column claimed_at timestamptz;

comment on column public.tickets.claimed_at is
  'When this ticket''s attendee (not necessarily the payer) linked it to their own account. Null until claimed.';

-- ============================================================================
-- Reassigns ownership, exactly once, to whoever proves they hold the emailed
-- claim link. `FOR UPDATE` closes the same race `check_in_ticket` already
-- guards against: two tabs submitting the same link at once must not both
-- report success.
-- ============================================================================

create or replace function public.claim_ticket(
  p_ticket_id   uuid,
  p_new_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_ticket public.tickets%rowtype;
begin
  select * into v_ticket
    from public.tickets
   where id = p_ticket_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_ticket.claimed_at is not null then
    return jsonb_build_object(
      'status', 'already_claimed',
      'claimedAt', v_ticket.claimed_at
    );
  end if;

  -- A ticket the buyer kept for themselves has nothing to claim — it is
  -- already on their own account, `user_id` says so from the moment it was
  -- issued (0008_ticket_ownership.sql).
  if v_ticket.is_self then
    return jsonb_build_object('status', 'not_claimable');
  end if;

  update public.tickets
     set user_id = p_new_user_id,
         claimed_at = now()
   where id = v_ticket.id;

  return jsonb_build_object(
    'status', 'claimed',
    'attendeeName', v_ticket.attendee_name,
    'tierId', v_ticket.tier_id
  );
end;
$fn$;

revoke all on function public.claim_ticket(uuid, uuid) from public, anon, authenticated;
