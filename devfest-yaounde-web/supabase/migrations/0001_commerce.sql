-- ============================================================================
-- DevFest Yaoundé — commerce schema (tickets, shop, payments)
--
-- Applies docs/decisions/0013 (PawaPay) and 0014 (Supabase).
-- Security model, per .claude/skills/devfest-security:
--   A01  RLS everywhere; a signed-in person reads ONLY their own rows.
--        No client-side INSERT/UPDATE on money tables — every write goes
--        through a route handler using the service role.
--   A08  Fulfilment is a single atomic, idempotent SQL function so a replayed
--        PawaPay callback can never double-deliver.
--   A09  payment_events is an audit trail of ids and states — never PII.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

create type public.payment_kind as enum ('tickets', 'shop');

-- pending          — intent persisted, nothing delivered yet
-- activated        — paid, verified against the intent, delivered exactly once
-- amount_mismatch  — paid, but amount/currency <> intent. Terminal. Needs a human.
-- failed           — PawaPay reported a terminal failure
create type public.payment_status as enum (
  'pending', 'activated', 'amount_mismatch', 'failed'
);

create type public.order_status as enum (
  'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'
);

-- ------------------------------------------------------------- profiles ----

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Mirror of auth.users for the shared Tickets+Shop account (PAGES.md 10.1).';

-- Keep profiles in step with auth.users on OAuth sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------- payment_intents ---
-- THE anchor of trust. Written before the user is ever redirected to PawaPay.
-- What we expect to be paid, and what we owe once it is. The callback body
-- never decides anything; this row does.

create table public.payment_intents (
  deposit_id      uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  kind            public.payment_kind not null,
  status          public.payment_status not null default 'pending',

  -- XAF has no minor unit, so these are whole francs stored as integers.
  charged_amount  integer not null check (charged_amount >= 0),
  net_amount      integer not null check (net_amount >= 0),
  currency        text    not null default 'XAF',

  discount_code   text,
  discount_amount integer not null default 0 check (discount_amount >= 0),

  -- Server-recomputed basket. NEVER built from client-supplied prices.
  line_items      jsonb   not null,
  -- Tickets only: one entry per attendee (name, email, apparel size).
  attendees       jsonb,
  contact         jsonb   not null,
  locale          text    not null default 'fr' check (locale in ('fr', 'en')),

  failure_code    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  activated_at    timestamptz
);

create index payment_intents_user_idx    on public.payment_intents (user_id, created_at desc);
create index payment_intents_pending_idx on public.payment_intents (status) where status = 'pending';

-- --------------------------------------------------------------- tickets ---

create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  deposit_id     uuid not null references public.payment_intents (deposit_id) on delete restrict,
  user_id        uuid not null references auth.users (id) on delete cascade,
  tier_id        text not null,
  attendee_name  text not null,
  attendee_email text not null,
  apparel_size   text,
  -- Deterministic HMAC of (deposit_id, index) — see src/lib/security/badge-code.ts.
  -- Deterministic so a replayed callback regenerates the SAME code.
  badge_code     text not null unique,
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now()
);

create index tickets_user_idx on public.tickets (user_id, created_at desc);

-- ---------------------------------------------------------------- orders ---

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  deposit_id   uuid not null unique references public.payment_intents (deposit_id) on delete restrict,
  user_id      uuid not null references auth.users (id) on delete cascade,
  status       public.order_status not null default 'processing',
  total_amount integer not null check (total_amount >= 0),
  currency     text not null default 'XAF',
  -- Pickup-vs-shipping is an open operational question (PAGES.md 11), so this
  -- stays a free-form snapshot rather than a premature set of columns.
  fulfilment   jsonb,
  created_at   timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    text not null,
  variant       jsonb,
  quantity      integer not null check (quantity > 0),
  unit_amount   integer not null check (unit_amount >= 0),
  -- Localized name captured at purchase time: the catalog may change later,
  -- a past order must keep reading the way it did when it was placed.
  name_snapshot jsonb not null
);

create index order_items_order_idx on public.order_items (order_id);

-- -------------------------------------------------------- discount_codes ---

create table public.discount_codes (
  code            text primary key,
  kind            text not null check (kind in ('percent', 'fixed')),
  value           integer not null check (value > 0),
  applies_to      text not null default 'both' check (applies_to in ('tickets', 'shop', 'both')),
  max_redemptions integer check (max_redemptions > 0),
  redeemed_count  integer not null default 0 check (redeemed_count >= 0),
  expires_at      timestamptz,
  active          boolean not null default true
);

comment on table public.discount_codes is
  'Who issues these is still an open item (PAGES.md 11). Managed by hand in the Supabase dashboard until a decision record says otherwise.';

-- ----------------------------------------------------------- rate_limits ---
-- Fixed-window counters. Postgres-backed on purpose: on Vercel an in-process
-- Map is per-instance and therefore not a limit at all.

create table public.rate_limits (
  bucket       text not null,
  identifier   text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, identifier, window_start)
);

-- --------------------------------------------------------- payment_events --

create table public.payment_events (
  id         bigserial primary key,
  deposit_id uuid,
  event      text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index payment_events_deposit_idx on public.payment_events (deposit_id, created_at desc);

comment on table public.payment_events is
  'A09 audit trail. Ids, states and failure codes only — never card data, never full attendee PII.';

-- ============================================================================
-- Fulfilment: one atomic, idempotent step.
--
-- The integration guide says "deliver, THEN mark activated", which leaves a
-- crash window between the two. Postgres lets us close it: delivery and the
-- status flip happen in one transaction, and the `status = 'pending'` guard
-- means two concurrent callbacks serialise — the loser sees the row already
-- claimed and returns 'already_applied'.
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
  -- Claim the intent. FOR UPDATE serialises concurrent callbacks; the status
  -- guard makes the second one a no-op instead of a second delivery.
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
    insert into public.orders (deposit_id, user_id, total_amount, currency)
    values (p_deposit_id, v_intent.user_id, v_intent.charged_amount, v_intent.currency)
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

-- Atomic fixed-window rate limit. Returns the count AFTER this hit, so the
-- caller compares against its own ceiling.
create or replace function public.bump_rate_limit(
  p_bucket         text,
  p_identifier     text,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_window timestamptz;
  v_count  integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count;
end;
$fn$;

revoke all on function public.bump_rate_limit(text, text, integer) from public, anon, authenticated;

-- ============================================================================
-- Row Level Security (A01)
--
-- Every table is deny-by-default. Read policies are scoped to auth.uid().
-- There is deliberately NO client INSERT/UPDATE policy on any money table:
-- writes happen server-side with the service role, which bypasses RLS.
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.payment_intents enable row level security;
alter table public.tickets         enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.discount_codes  enable row level security;
alter table public.rate_limits     enable row level security;
alter table public.payment_events  enable row level security;

create policy "own profile readable"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "own profile updatable"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "own intents readable"
  on public.payment_intents for select
  using ((select auth.uid()) = user_id);

create policy "own tickets readable"
  on public.tickets for select
  using ((select auth.uid()) = user_id);

create policy "own orders readable"
  on public.orders for select
  using ((select auth.uid()) = user_id);

create policy "own order items readable"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and o.user_id = (select auth.uid())
    )
  );

-- discount_codes, rate_limits and payment_events get NO policy on purpose:
-- RLS is on and nothing matches, so anon/authenticated read nothing at all.
-- Only the service role touches them.
