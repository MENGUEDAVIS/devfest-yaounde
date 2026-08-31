-- ============================================================================
-- 0003 — Treat a blank discount code as "no discount code"
--
-- `create_payment_intent` guarded on `p_discount_code is not null`. Postgres
-- reports a parameter without a DEFAULT as required, so the generated
-- TypeScript types it as `string`, not `string | undefined` — and a caller
-- that has no code has nowhere honest to put that fact.
--
-- Adding `default null` is not available: the parameters after it have no
-- defaults, and PL/pgSQL requires defaults to be contiguous at the tail.
--
-- So the guard now treats NULL and '' identically. The caller passes an empty
-- string when there is no code, and the function behaves exactly as it did
-- for NULL — rather than looking up '' and reporting it exhausted.
-- ============================================================================

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
  v_window    interval := make_interval(secs => p_reservation_window);
  v_tier      record;
  v_capacity  integer;
  v_issued    integer;
  v_reserved  integer;
  v_code      text;
  v_discount  public.discount_codes%rowtype;
  v_committed integer;
begin
  -- NULL and '' both mean "no code".
  v_code := nullif(upper(trim(coalesce(p_discount_code, ''))), '');

  -- ---- tier capacity -------------------------------------------------------
  if p_kind = 'tickets' and p_attendees is not null then
    for v_tier in
      select a ->> 'tierId' as tier_id, count(*)::integer as wanted
        from jsonb_array_elements(p_attendees) a
       group by 1
       order by 1                       -- stable lock order: no deadlocks
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
    discount_code, discount_amount, line_items, attendees, contact, locale
  )
  values (
    p_deposit_id, p_user_id, p_kind, 'pending', p_charged_amount, p_net_amount,
    p_currency, v_code, p_discount_amount, p_line_items, p_attendees,
    p_contact, p_locale
  );

  return 'created';
end;
$fn$;

revoke all on function public.create_payment_intent(
  uuid, uuid, public.payment_kind, integer, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, jsonb, integer
) from public, anon, authenticated;
