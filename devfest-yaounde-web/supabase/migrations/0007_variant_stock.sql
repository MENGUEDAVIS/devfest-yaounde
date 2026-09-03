-- ============================================================================
-- 0007 — Reserve per-variant stock (G12)
--
-- The catalog carried ONE status per product and no per-variant stock, so a
-- single sold-out size could not be refused — only the whole product. The
-- frontend correctly declined to grey out individual sizes on a guess.
--
-- Same shape as tier capacity (0002/0016), for the same reason: counting in
-- TypeScript and inserting afterwards leaves a window where two buyers both
-- see the last XL as free. The check and the insert have to be one
-- transaction.
--
-- The number is declared in products.json and passed in as
--   {"tee-edition|M|Noir": 30, ...}
-- keyed exactly as `variantKey()` builds it. A combination absent from that
-- object is unlimited.
-- ============================================================================

-- Supports counting what has already been sold per product+variant.
create index if not exists order_items_product_variant_idx
  on public.order_items (product_id);

drop function if exists public.create_payment_intent(
  uuid, uuid, public.payment_kind, integer, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, jsonb, integer, text, jsonb
);

create or replace function public.create_payment_intent(
  p_deposit_id          uuid,
  p_user_id             uuid,
  p_kind                public.payment_kind,
  p_charged_amount      integer,
  p_net_amount          integer,
  p_currency            text,
  p_discount_code       text,
  p_discount_amount     integer,
  p_line_items          jsonb,
  p_attendees           jsonb,
  p_contact             jsonb,
  p_locale              text,
  p_tier_capacities     jsonb default '{}'::jsonb,
  p_reservation_window  integer default 1800,
  p_terms_text          text default null,
  p_fulfilment          jsonb default null,
  p_variant_capacities  jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_window    interval := make_interval(secs => p_reservation_window);
  v_tier      record;
  v_line      record;
  v_capacity  integer;
  v_issued    integer;
  v_reserved  integer;
  v_code      text;
  v_discount  public.discount_codes%rowtype;
  v_committed integer;
begin
  v_code := nullif(upper(trim(coalesce(p_discount_code, ''))), '');

  -- ---- tier capacity (tickets) --------------------------------------------
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

  -- ---- variant stock (shop) ------------------------------------------------
  if p_kind = 'shop' and p_line_items is not null then
    for v_line in
      select
        li ->> 'productId'                                as product_id,
        coalesce(li -> 'variant' ->> 'size', '')          as size,
        coalesce(li -> 'variant' ->> 'color', '')         as color,
        sum((li ->> 'quantity')::integer)::integer        as wanted
        from jsonb_array_elements(p_line_items) li
       group by 1, 2, 3
       order by 1, 2, 3                  -- stable lock order: no deadlocks
    loop
      -- Unlimited unless the catalog named a number for this combination.
      if not (p_variant_capacities ? (v_line.product_id || '|' || v_line.size || '|' || v_line.color)) then
        continue;
      end if;
      v_capacity := (p_variant_capacities ->> (v_line.product_id || '|' || v_line.size || '|' || v_line.color))::integer;

      perform pg_advisory_xact_lock(
        hashtext('variant:' || v_line.product_id || '|' || v_line.size || '|' || v_line.color)
      );

      -- Already sold: order_items only exist once a deposit was fulfilled.
      select coalesce(sum(oi.quantity), 0)::integer into v_issued
        from public.order_items oi
       where oi.product_id = v_line.product_id
         and coalesce(oi.variant ->> 'size', '')  = v_line.size
         and coalesce(oi.variant ->> 'color', '') = v_line.color;

      -- Held by checkouts still in flight.
      select coalesce(sum(x.qty), 0)::integer into v_reserved
        from public.payment_intents pi
        cross join lateral (
          select coalesce(sum((li ->> 'quantity')::integer), 0) as qty
            from jsonb_array_elements(pi.line_items) li
           where li ->> 'productId' = v_line.product_id
             and coalesce(li -> 'variant' ->> 'size', '')  = v_line.size
             and coalesce(li -> 'variant' ->> 'color', '') = v_line.color
        ) x
       where pi.status = 'pending'
         and pi.kind = 'shop'
         and pi.created_at > now() - v_window;

      if v_issued + v_reserved + v_line.wanted > v_capacity then
        -- Names the combination so the screen can point at the right control.
        return 'variant_sold_out:' || v_line.product_id || '|' || v_line.size || '|' || v_line.color;
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
  jsonb, jsonb, jsonb, text, jsonb, integer, text, jsonb, jsonb
) from public, anon, authenticated;

/**
 * What is left of a capped variant, for the shop screen.
 *
 * Read-only and approximate by design: it counts the same two things the
 * reservation does, but a page render is a moment in time. Checkout re-checks
 * atomically, so this can only ever be optimistic — never a promise.
 */
create or replace function public.variant_taken(
  p_product_id         text,
  p_size               text,
  p_color              text,
  p_reservation_window integer default 1800
)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select
    coalesce((
      select sum(oi.quantity)::integer
        from public.order_items oi
       where oi.product_id = p_product_id
         and coalesce(oi.variant ->> 'size', '')  = coalesce(p_size, '')
         and coalesce(oi.variant ->> 'color', '') = coalesce(p_color, '')
    ), 0)
  + coalesce((
      select sum(x.qty)::integer
        from public.payment_intents pi
        cross join lateral (
          select coalesce(sum((li ->> 'quantity')::integer), 0) as qty
            from jsonb_array_elements(pi.line_items) li
           where li ->> 'productId' = p_product_id
             and coalesce(li -> 'variant' ->> 'size', '')  = coalesce(p_size, '')
             and coalesce(li -> 'variant' ->> 'color', '') = coalesce(p_color, '')
        ) x
       where pi.status = 'pending'
         and pi.kind = 'shop'
         and pi.created_at > now() - make_interval(secs => p_reservation_window)
    ), 0);
$fn$;

revoke all on function public.variant_taken(text, text, text, integer) from public, anon, authenticated;
