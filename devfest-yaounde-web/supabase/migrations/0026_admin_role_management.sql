-- ============================================================================
-- 0026 — Promote / demote admins from the dashboard (PHASE23 §E)
--
-- Until now `organisers` was managed by hand in the Supabase SQL console. This
-- adds ONE audited, lockout-proof way to change membership from the Users
-- page. It is a privilege-escalation surface, so the rules that matter live
-- HERE, in the database, not in the route or the UI — a direct API call, a
-- buggy caller and a hidden button all reach the same function.
--
--   * Only an existing organiser can change anything (re-checked INSIDE the
--     lock, so an admin demoted a moment ago cannot finish what they started).
--   * The LAST organiser can never be removed — by this function, or (trigger
--     below) by any other statement.
--   * Removing yourself needs an explicit `p_confirm_self`.
--   * Every promotion, demotion AND refused attempt writes an `admin_audit`
--     row in the SAME transaction. Unlike the best-effort `recordAudit` used
--     elsewhere, if the audit row cannot be written the change does not
--     happen: for this action the record matters more than the action.
--
-- DEPLOY ORDER: apply this BEFORE the code that calls it. If the code is live
-- first the RPC does not exist and every attempt fails CLOSED (a 500, nothing
-- changes). It is never applied automatically by the app.
-- ============================================================================

create or replace function public.set_organiser_role(
  p_actor        uuid,
  p_target       uuid,
  p_action       text,
  p_confirm_self boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer;
begin
  if p_action not in ('promote', 'demote') then
    raise exception 'set_organiser_role: unknown action %', p_action;
  end if;

  -- ONE lock for all membership changes, held to the end of the transaction.
  -- Two admins demoting each other at the same instant queue here, and the
  -- second one then counts the rows the first one left behind.
  perform pg_advisory_xact_lock(hashtext('devfest:organiser-membership'));

  if not exists (select 1 from public.organisers where user_id = p_actor) then
    -- Only reachable by a race (the caller was demoted between the route's
    -- check and this lock) or a call that bypassed the route. Worth a record.
    insert into public.admin_audit (actor, action, target, before, after)
      values (
        p_actor, 'organiser.change_refused', p_target::text,
        jsonb_build_object('attempted', p_action),
        jsonb_build_object('reason', 'actor_not_admin')
      );
    return 'actor_not_admin';
  end if;

  if p_action = 'promote' then
    if not exists (select 1 from auth.users where id = p_target) then
      return 'target_not_found';
    end if;
    if exists (select 1 from public.organisers where user_id = p_target) then
      return 'already_admin';
    end if;

    insert into public.organisers (user_id, note)
      values (p_target, 'Promoted from the Users page');
    select count(*) into v_count from public.organisers;

    insert into public.admin_audit (actor, action, target, before, after)
      values (
        p_actor, 'organiser.promoted', p_target::text,
        jsonb_build_object('role', 'user'),
        jsonb_build_object('role', 'admin', 'admins_after', v_count)
      );
    return 'promoted';
  end if;

  -- demote
  if not exists (select 1 from public.organisers where user_id = p_target) then
    return 'not_admin';
  end if;

  select count(*) into v_count from public.organisers;

  -- The hard rule comes BEFORE the self-confirmation check, so no flag a
  -- caller can send is able to get past it.
  if v_count <= 1 then
    insert into public.admin_audit (actor, action, target, before, after)
      values (
        p_actor, 'organiser.demote_refused', p_target::text,
        jsonb_build_object('role', 'admin', 'admins', v_count),
        jsonb_build_object('reason', 'last_admin', 'self', p_target = p_actor)
      );
    return 'last_admin';
  end if;

  if p_target = p_actor and not coalesce(p_confirm_self, false) then
    insert into public.admin_audit (actor, action, target, before, after)
      values (
        p_actor, 'organiser.demote_refused', p_target::text,
        jsonb_build_object('role', 'admin', 'admins', v_count),
        jsonb_build_object('reason', 'self_confirmation_required')
      );
    return 'self_confirmation_required';
  end if;

  delete from public.organisers where user_id = p_target;

  insert into public.admin_audit (actor, action, target, before, after)
    values (
      p_actor, 'organiser.demoted', p_target::text,
      jsonb_build_object('role', 'admin', 'admins_before', v_count),
      jsonb_build_object('role', 'user', 'admins_after', v_count - 1,
                         'self', p_target = p_actor)
    );
  return 'demoted';
end
$fn$;

comment on function public.set_organiser_role(uuid, uuid, text, boolean) is
  'The only sanctioned way to change organiser membership from the app: locks, re-checks the actor, refuses to remove the last organiser, and audits in the same transaction. Service role only.';

-- Not callable by a signed-in user through PostgREST — only the server (service
-- role) may run it, and the route in front of it does the caller's authz.
revoke all on function public.set_organiser_role(uuid, uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.set_organiser_role(uuid, uuid, text, boolean)
  to service_role;

-- ---------------------------------------------------------- second net -----
-- The function above is the app's path. This is the net under EVERY path — the
-- SQL console, a future bug, a cascade — so the table can never reach zero
-- organisers and lock everybody out of the dashboard.
--
-- Statement-level with a transition table, not a row trigger: a row trigger
-- sees the table as it was at the start of the statement, so a single
-- `delete` of both of two rows would pass each row's check and leave none.
-- Tested against a real Postgres engine (tests/db/organiser-roles.mjs).
--
-- Deliberate consequence: deleting the auth user of the LAST organiser is
-- refused, because that delete cascades into `organisers`. Add the next
-- organiser first, then remove the old one.

create or replace function public.organisers_keep_one()
returns trigger
language plpgsql
as $fn$
begin
  if exists (select 1 from deleted_rows)
     and not exists (select 1 from public.organisers) then
    raise exception 'refusing to remove the last organiser: add another first'
      using errcode = 'P0001';
  end if;
  return null;
end
$fn$;

drop trigger if exists organisers_keep_one on public.organisers;
create trigger organisers_keep_one
  after delete on public.organisers
  referencing old table as deleted_rows
  for each statement
  execute function public.organisers_keep_one();

comment on table public.admin_audit is
  'Who changed what. Privileged writes (orders, wall, content, discounts, check-in, refund requests, organiser promotions/demotions and refused attempts) record a row. G22.';
