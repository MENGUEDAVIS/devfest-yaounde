/*
 * Swag stops CREATING shop products and starts REFERENCING them (ADR 0054).
 *
 * Phase 20 auto-created a draft shop product for every swag item on every
 * ticket tier. In practice that produced duplicates: the same t-shirt
 * bundled across four tiers became four near-identical listings, and every
 * tier edit could mint more. This migration retires that model in the data;
 * the application code stops writing it.
 *
 * ORDER MATTERS — the tier rewrite reads the surviving product ids, so
 * products are settled first.
 *
 *   1. Snapshot both payloads into `editorial_migration_backup` first.
 *   2. Delete auto-created products (`sourceSwag` present) that nothing has
 *      ever been ordered from.
 *   3. Strip the retired `sourceSwag` marker off any that SURVIVE, so no
 *      product is left claiming an origin that no longer exists.
 *   4. Rewrite each tier's `swag` array into `swagProductIds`, keeping only
 *      links that still resolve to a product present after step 2.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: it never guesses. A swag item with no
 * `shopProductId` was only ever a name and an image on the tier — there is
 * no fact here about which shop listing it "meant", and inventing one would
 * attach the wrong product to a paid tier. Those become no reference at all,
 * and an admin picks the right listing in the dashboard. A tier's swag list
 * legitimately starting EMPTY is the expected outcome, not a failure.
 *
 * `updated_at`/`updated_by` are deliberately NOT touched: this is a schema
 * migration, not an editorial edit, and overwriting `updated_by` would
 * either break its FK to `auth.users` or blame a real organiser for it.
 *
 * Idempotent: a second run finds no `sourceSwag` and no `swag` key, and
 * rewrites both payloads to themselves.
 */

-- ------------------------------------------------------------------ backup --
-- Cheap insurance for a one-way data rewrite. Not a collection, so it needs
-- its own table: `editorial_documents.id` is CHECK-constrained to the ten
-- known collection ids and will not accept a backup row.
create table if not exists public.editorial_migration_backup (
  migration   text        not null,
  document_id text        not null,
  payload     jsonb       not null,
  taken_at    timestamptz not null default now(),
  primary key (migration, document_id)
);

comment on table public.editorial_migration_backup is
  'Pre-migration snapshots of editorial_documents payloads. Safe to drop once a migration is confirmed good.';

alter table public.editorial_migration_backup enable row level security;
-- No policy: service-role only. Nothing in the app reads this.

insert into public.editorial_migration_backup (migration, document_id, payload)
select '0021', d.id, d.payload
from public.editorial_documents d
where d.id in ('products', 'ticket-tiers')
on conflict (migration, document_id) do nothing;

-- ---------------------------------------------------------------- products --
-- Auto-created listings with no order history are removed. One that HAS been
-- ordered from is inventory with a real transaction behind it: an order's
-- line item points at `product_id`, and deleting the product it names would
-- leave that order unable to say what was bought. Those are kept, and only
-- lose the retired marker.
with exploded as (
  select item, ordinality
  from public.editorial_documents d,
       jsonb_array_elements(d.payload) with ordinality as t(item, ordinality)
  where d.id = 'products'
),
kept as (
  select (item - 'sourceSwag') as item, ordinality
  from exploded
  where item->'sourceSwag' is null
     or exists (
          select 1 from public.order_items oi
          where oi.product_id = item->>'id'
        )
)
update public.editorial_documents d
set payload = coalesce(
      (select jsonb_agg(k.item order by k.ordinality) from kept k),
      '[]'::jsonb
    )
where d.id = 'products';

-- ------------------------------------------------------------ ticket tiers --
-- `swag: [{id, name, images, shopProductId?}]` becomes
-- `swagProductIds: [<id>, ...]`, keeping only ids that still resolve to a
-- product surviving the step above.
with survivors as (
  select coalesce(
           (select array_agg(item->>'id')
            from public.editorial_documents d,
                 jsonb_array_elements(d.payload) as item
            where d.id = 'products'),
           array[]::text[]
         ) as ids
),
rewritten as (
  select
    (tier - 'swag') || jsonb_build_object(
      'swagProductIds',
      coalesce(
        (select jsonb_agg(sw->>'shopProductId')
         from jsonb_array_elements(coalesce(tier->'swag', '[]'::jsonb)) as sw
         where sw->>'shopProductId' is not null
           -- `= any(s.ids)` against the CROSS JOINed column value, NOT
           -- `= any((select ids from survivors))` — Postgres reads that
           -- subquery form as "any ROW of the subquery", and `survivors`
           -- has exactly one row whose `ids` is itself a text[], so it
           -- tried `text = text[]` and refused (never actually run before
           -- this deploy, per ADR 0054's own "not verified" note).
           and sw->>'shopProductId' = any(s.ids)),
        '[]'::jsonb
      )
    ) as tier,
    ordinality
  from public.editorial_documents d,
       jsonb_array_elements(d.payload) with ordinality as t(tier, ordinality),
       survivors s
  where d.id = 'ticket-tiers'
)
update public.editorial_documents d
set payload = coalesce(
      (select jsonb_agg(r.tier order by r.ordinality) from rewritten r),
      '[]'::jsonb
    )
where d.id = 'ticket-tiers';
