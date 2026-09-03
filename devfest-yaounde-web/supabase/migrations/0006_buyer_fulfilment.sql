-- ============================================================================
-- 0006 — Let the buyer say how they want their order (G13)
--
-- `orders.fulfilment` existed from 0001 but was written ONLY by organisers,
-- through PATCH /api/orders/:id/status. A buyer's choice had nowhere to go, so
-- the frontend removed the picker rather than ship a control that discards
-- what it collects.
--
-- Scope, deliberately narrow: this records a PREFERENCE and a note. It is not
-- a shipping engine — zones, fees and pickup windows are still undecided
-- (PAGES.md §11), and the copy still says the team coordinates afterwards.
-- What it removes is the round-trip where someone has to ask every buyer
-- "pickup or delivery, and where?".
--
-- The buyer's answer is stored under `requested`, separate from whatever an
-- organiser later writes, so neither overwrites the other.
-- ============================================================================

alter table public.payment_intents
  add column fulfilment jsonb;

comment on column public.payment_intents.fulfilment is
  'What the buyer asked for at checkout. Copied onto the order under `requested` at fulfilment; organiser edits live alongside it, never on top of it.';

-- Signature changes again, so the previous one has to go first: a defaulted
-- parameter added to `create or replace` produces an overload, and the old
-- argument list would then be ambiguous rather than replaced.
drop function if exists public.create_payment_intent(
  uuid, uuid, public.payment_kind, integer, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, jsonb, integer, text
);

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
  p_reservation_window integer default 1800,
  p_terms_text         text default null,
  p_fulfilment         jsonb default null
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_window    interval := make_interval(secs => p_reservation_window);
  v_tier      record;
  v_capacity  integer;
  v_issued    integer;
  v_reserved  integer;
  v_code      text;
  v_discount  public.discount_codes%rowtype;
  v_committed integer;
begin
  v_code := nullif(upper(trim(coalesce(p_discount_code, ''))), '');

  -- ---- tier capacity -------------------------------------------------------
  if p_kind = 'tickets' and p_attendees is not null then
    for v_tier in
      select a ->> 'tierId' as tier_id, count(*)::integer as wanted
        from jsonb_array_elements(p_attendees) a
       group by 1
       order by 1
    loop
      if not (p_tier_capacities ? v_tier.tier_id) then
        continue;
      end if;
      v_capacity := (p_tier_capacities ->> v_tier.tier_id)::integer;

      perform pg_advisory_xact_lock(hashtext('tier:' || v_tier.tier_id));

      select count(*)::integer into v_issued
        from public.tickets t
       where t.tier_id = v_tier.tier_id;

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
  if v_code is not null then
    perform pg_advisory_xact_lock(hashtext('discount:' || v_code));

    select * into v_discount from public.discount_codes where code = v_code;
    if not found or not v_discount.active then
      return 'discount_exhausted';
    end if;

    if v_discount.max_redemptions is not null then
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
    discount_code, discount_amount, line_items, attendees, contact, locale,
    terms_text, terms_accepted_at, fulfilment
  )
  values (
    p_deposit_id, p_user_id, p_kind, 'pending', p_charged_amount, p_net_amount,
    p_currency, v_code, p_discount_amount, p_line_items, p_attendees,
    p_contact, p_locale,
    nullif(trim(coalesce(p_terms_text, '')), ''),
    case when nullif(trim(coalesce(p_terms_text, '')), '') is null
         then null else now() end,
    p_fulfilment
  );

  return 'created';
end;
$fn$;

revoke all on function public.create_payment_intent(
  uuid, uuid, public.payment_kind, integer, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, jsonb, integer, text, jsonb
) from public, anon, authenticated;

-- ============================================================================
-- Carry the buyer's request onto the order at fulfilment.
--
-- Nested under `requested` so an organiser writing a courier reference later
-- sits BESIDE it rather than erasing what the buyer asked for.
-- ============================================================================

create or replace function public.apply_paid_deposit(
  p_deposit_id  uuid,
  p_badge_codes text[] default null
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_intent   public.payment_intents%rowtype;
  v_order_id uuid;
  v_item     jsonb;
  v_attendee jsonb;
  v_index    integer := 0;
begin
  select * into v_intent
    from public.payment_intents
   where deposit_id = p_deposit_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if v_intent.status <> 'pending' then
    return 'already_applied';
  end if;

  if v_intent.kind = 'tickets' then
    if p_badge_codes is null then
      raise exception 'badge codes required to fulfil a ticket deposit';
    end if;

    for v_attendee in select * from jsonb_array_elements(v_intent.attendees) loop
      v_index := v_index + 1;
      insert into public.tickets (
        deposit_id, user_id, tier_id, attendee_name, attendee_email,
        apparel_size, badge_code
      )
      values (
        p_deposit_id,
        v_intent.user_id,
        v_attendee ->> 'tierId',
        v_attendee ->> 'name',
        v_attendee ->> 'email',
        nullif(v_attendee ->> 'apparelSize', ''),
        p_badge_codes[v_index]
      );
    end loop;

  else
    insert into public.orders (
      deposit_id, user_id, total_amount, currency, fulfilment
    )
    values (
      p_deposit_id, v_intent.user_id, v_intent.charged_amount, v_intent.currency,
      case when v_intent.fulfilment is null then null
           else jsonb_build_object('requested', v_intent.fulfilment) end
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_intent.line_items) loop
      insert into public.order_items (
        order_id, product_id, variant, quantity, unit_amount, name_snapshot
      )
      values (
        v_order_id,
        v_item ->> 'productId',
        v_item -> 'variant',
        (v_item ->> 'quantity')::integer,
        (v_item ->> 'unitAmount')::integer,
        v_item -> 'name'
      );
    end loop;
  end if;

  if v_intent.discount_code is not null then
    update public.discount_codes
       set redeemed_count = redeemed_count + 1
     where code = v_intent.discount_code;
  end if;

  update public.payment_intents
     set status = 'activated', activated_at = now(), updated_at = now()
   where deposit_id = p_deposit_id;

  insert into public.payment_events (deposit_id, event, detail)
  values (p_deposit_id, 'fulfilled', jsonb_build_object('kind', v_intent.kind));

  return 'applied';
end;
$fn$;

revoke all on function public.apply_paid_deposit(uuid, text[]) from public, anon, authenticated;
