-- ============================================================================
-- 0008 — Record which ticket the buyer kept for themselves (G8)
--
-- "This one's mine" existed in the checkout and drove prefill only. Nothing
-- recorded it, so `/account` could not tell "my ticket" from "a ticket I
-- bought for someone else" — and at the door, a buyer holding five tickets
-- had no way to say which one was theirs.
--
-- Decided 2026-09-03: it must be recorded. When the buyer keeps one, their
-- own name goes on it; when they do not, they type the other person's name.
--
-- `tickets.user_id` already says WHO PAID. This says which of those tickets
-- the payer means to use. The two are different questions and both matter.
-- ============================================================================

alter table public.tickets
  add column is_self boolean not null default false;

comment on column public.tickets.is_self is
  'The buyer kept this one for themselves. user_id says who paid; this says which ticket is theirs to use.';

-- Finding "my ticket" among an order is the common read on /account.
create index tickets_self_idx on public.tickets (user_id) where is_self;

-- ============================================================================
-- Carry it through fulfilment.
--
-- Read from the attendee JSON the intent stored, so it travels with the rest
-- of the attendee record rather than being reconstructed later from a guess.
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
        apparel_size, badge_code, is_self
      )
      values (
        p_deposit_id,
        v_intent.user_id,
        v_attendee ->> 'tierId',
        v_attendee ->> 'name',
        v_attendee ->> 'email',
        nullif(v_attendee ->> 'apparelSize', ''),
        p_badge_codes[v_index],
        coalesce((v_attendee ->> 'isSelf')::boolean, false)
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
