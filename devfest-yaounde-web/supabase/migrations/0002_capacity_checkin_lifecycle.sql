-- ============================================================================
-- 0002 — Capacity reservations, organisers, check-in, order lifecycle, cleanup
--
-- Fixes two concurrency bugs shipped in 0001, and adds the operational pieces
-- the ticket flow needs once people are actually at the door.
--
-- The bugs, and why they could not be fixed in application code:
--
--   Tier stock — `quantityAvailable` was only compared against the size of
--   the current order, so a 150-seat tier sold 150 PER ORDER, unbounded.
--   Counting sold tickets in TypeScript first and inserting after leaves a
--   race between the count and the insert; two buyers both read 149 and both
--   proceed. The check and the insert have to be one transaction.
--
--   Discount codes — `max_redemptions` was read at quote time but only
--   incremented at fulfilment, so any number of concurrent checkouts passed
--   the same single-use code.
--
-- Both are fixed the same way: a capacity/redemption RESERVATION is taken at
-- intent creation, inside one transaction, serialised by an advisory lock.
-- A pending intent holds its reservation for a bounded window, so an
-- abandoned checkout releases its seats instead of holding them forever.
-- ============================================================================

-- ------------------------------------------------------------ organisers ---
-- Who is allowed to scan a badge or move an order along. Deliberately a table
-- rather than a JWT claim: adding an organiser during the event should be one
-- row, not a re-deploy.

create table public.organisers (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  note     text,
  added_at timestamptz not null default now()
);

comment on table public.organisers is
  'Membership grants check-in and order-management rights. Managed by hand in the Supabase dashboard.';

create or replace function public.is_organiser(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from public.organisers o where o.user_id = p_user_id);
$fn$;

-- ------------------------------------------------- intent + reservations ---

/**
 * Creates a payment intent, refusing it if the tiers are full or the discount
 * code is spent.
 *
 * Capacity lives in src/data/ticket-tiers.json, not in the database, so the
 * caller passes it in as {"tierId": capacity}. A tier absent from that object
 * is unlimited.
 *
 * Returns 'created', or 'sold_out:<tierId>', or 'discount_exhausted'.
 */
create or replace function public.create_payment_intent(
  p_deposit_id         uuid,
  p_user_id            uuid,
  p_kind               public.payment_kind,
  p_charged_amount     integer,
  p_net_amount         integer,
  p_currency           text,
  p_discount_code      text,
  p_discount_amount    integer,
  p_line_items         jsonb,
  p_attendees          jsonb,
  p_contact            jsonb,
  p_locale             text,
  p_tier_capacities    jsonb default '{}'::jsonb,
  p_reservation_window integer default 1800
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_window   interval := make_interval(secs => p_reservation_window);
  v_tier     record;
  v_capacity integer;
  v_issued   integer;
  v_reserved integer;
  v_code     text;
  v_discount public.discount_codes%rowtype;
  v_committed integer;
begin
  -- ---- tier capacity -------------------------------------------------------
  if p_kind = 'tickets' and p_attendees is not null then
    for v_tier in
      select a ->> 'tierId' as tier_id, count(*)::integer as wanted
        from jsonb_array_elements(p_attendees) a
       group by 1
       order by 1                       -- stable lock order: no deadlocks
    loop
      -- Unlimited unless the caller named a capacity for this tier.
      if not (p_tier_capacities ? v_tier.tier_id) then
        continue;
      end if;
      v_capacity := (p_tier_capacities ->> v_tier.tier_id)::integer;

      -- Serialise every concurrent checkout touching this tier. Transaction
      -- scoped, so it is released on commit or rollback either way.
      perform pg_advisory_xact_lock(hashtext('tier:' || v_tier.tier_id));

      select count(*)::integer into v_issued
        from public.tickets t
       where t.tier_id = v_tier.tier_id;

      -- Seats held by checkouts still in flight.
      select coalesce(sum(x.cnt), 0)::integer into v_reserved
        from public.payment_intents pi
        cross join lateral (
          select count(*)::integer as cnt
            from jsonb_array_elements(pi.attendees) a
           where a ->> 'tierId' = v_tier.tier_id
        ) x
       where pi.status = 'pending'
         and pi.kind = 'tickets'
         and pi.created_at > now() - v_window;

      if v_issued + v_reserved + v_tier.wanted > v_capacity then
        return 'sold_out:' || v_tier.tier_id;
      end if;
    end loop;
  end if;

  -- ---- discount redemption -------------------------------------------------
  if p_discount_code is not null then
    v_code := upper(trim(p_discount_code));
    perform pg_advisory_xact_lock(hashtext('discount:' || v_code));

    select * into v_discount from public.discount_codes where code = v_code;
    if not found or not v_discount.active then
      return 'discount_exhausted';
    end if;

    if v_discount.max_redemptions is not null then
      -- Committed redemptions plus the ones held by in-flight checkouts.
      select v_discount.redeemed_count + count(*)::integer into v_committed
        from public.payment_intents pi
       where pi.discount_code = v_code
         and pi.status = 'pending'
         and pi.created_at > now() - v_window;

      if v_committed + 1 > v_discount.max_redemptions then
        return 'discount_exhausted';
      end if;
    end if;
  end if;

  -- ---- the intent itself ---------------------------------------------------
  insert into public.payment_intents (
    deposit_id, user_id, kind, status, charged_amount, net_amount, currency,
    discount_code, discount_amount, line_items, attendees, contact, locale
  )
  values (
    p_deposit_id, p_user_id, p_kind, 'pending', p_charged_amount, p_net_amount,
    p_currency, nullif(upper(trim(coalesce(p_discount_code, ''))), ''),
    p_discount_amount, p_line_items, p_attendees, p_contact, p_locale
  );

  return 'created';
end;
$fn$;

revoke all on function public.create_payment_intent(
  uuid, uuid, public.payment_kind, integer, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, jsonb, integer
) from public, anon, authenticated;

-- Supports the reservation counts above.
create index payment_intents_discount_pending_idx
  on public.payment_intents (discount_code, created_at)
  where status = 'pending';

create index tickets_tier_idx on public.tickets (tier_id);

-- ---------------------------------------------------------------- check-in --

/**
 * Marks a ticket as used, exactly once.
 *
 * Returns a jsonb envelope rather than raising, because "already checked in"
 * is a normal thing to happen at a door — the person scanning needs to see
 * WHEN it was first used, not an error page.
 */
create or replace function public.check_in_ticket(p_badge_code text)
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
   where badge_code = upper(trim(p_badge_code))
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_ticket.checked_in_at is not null then
    return jsonb_build_object(
      'status', 'already_checked_in',
      'attendeeName', v_ticket.attendee_name,
      'tierId', v_ticket.tier_id,
      'checkedInAt', v_ticket.checked_in_at
    );
  end if;

  update public.tickets
     set checked_in_at = now()
   where id = v_ticket.id;

  return jsonb_build_object(
    'status', 'checked_in',
    'attendeeName', v_ticket.attendee_name,
    'tierId', v_ticket.tier_id,
    'ticketId', v_ticket.id
  );
end;
$fn$;

revoke all on function public.check_in_ticket(text) from public, anon, authenticated;

-- --------------------------------------------------------------- cleanup ---

/**
 * Fails intents that were never paid, releasing the seats and discount
 * redemptions they were holding. Terminal, so nothing can revive them.
 */
create or replace function public.expire_stale_intents(p_older_than_seconds integer default 3600)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer;
begin
  with expired as (
    update public.payment_intents
       set status = 'failed',
           failure_code = 'expired',
           updated_at = now()
     where status = 'pending'
       and created_at < now() - make_interval(secs => p_older_than_seconds)
    returning deposit_id
  )
  select count(*)::integer into v_count from expired;

  return v_count;
end;
$fn$;

/** Fixed-window counters are worthless once their window has passed. */
create or replace function public.cleanup_rate_limits(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer;
begin
  with removed as (
    delete from public.rate_limits
     where window_start < now() - make_interval(secs => p_older_than_seconds)
    returning 1
  )
  select count(*)::integer into v_count from removed;

  return v_count;
end;
$fn$;

revoke all on function public.expire_stale_intents(integer) from public, anon, authenticated;
revoke all on function public.cleanup_rate_limits(integer) from public, anon, authenticated;

-- ------------------------------------------------------------------ RLS ----

alter table public.organisers enable row level security;

-- Organisers can see the roster; nobody else sees it exists.
create policy "organisers readable by organisers"
  on public.organisers for select
  using (public.is_organiser());

-- Organisers legitimately need to see every ticket and order at the door and
-- in the stockroom. This widens the existing owner-only policies rather than
-- replacing them: a policy set is OR-ed, so attendees keep exactly what they
-- had.
create policy "organisers read all tickets"
  on public.tickets for select
  using (public.is_organiser());

create policy "organisers read all orders"
  on public.orders for select
  using (public.is_organiser());

create policy "organisers read all order items"
  on public.order_items for select
  using (public.is_organiser());
