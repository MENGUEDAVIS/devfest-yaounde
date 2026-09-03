-- ============================================================================
-- 0009 — The DP community wall (G20)
--
-- Implements docs/backend/dp-gallery-contract.md. This is the one path by
-- which a card leaves someone's device, and it publishes PHOTOGRAPHS OF
-- FACES, so the shape of the table is the shape of the safeguards:
--
--   * nothing is public until a human sets status='approved';
--   * the consent record stores WHEN and AGAINST WHICH WORDING, because a
--     boolean on its own is a claim rather than evidence — the same reasoning
--     as the refund acknowledgment in 0005;
--   * takedown works without an account, through a token whose HASH is all we
--     keep, for the same reason a password is never stored in the clear.
--
-- ADR 0021 records why this narrowly reverses the no-upload rule of ADR 0015,
-- and re-arms the "Uploads (DP Generator)" section of the security checklist.
-- ============================================================================

create table public.dp_cards (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,
  nickname      text not null check (length(nickname) <= 28),
  locale        text not null check (locale in ('fr', 'en')),

  -- The consent record. `consent` is checked true, so a row cannot exist
  -- without it: there is no such thing as a card here that nobody agreed to.
  consent       boolean not null default false check (consent),
  consent_at    timestamptz not null,
  consent_text  text not null,

  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,

  -- Proof of authorship for someone with no account. A hash, never the token.
  deletion_hash text not null,

  created_at    timestamptz not null default now(),
  -- Coarse, for rate limiting and abuse only — not an identifier to keep.
  submitter_ip  inet
);

-- The wall reads newest-first or shuffled; both start from this.
create index dp_cards_approved_idx
  on public.dp_cards (created_at desc) where status = 'approved';

-- The review queue.
create index dp_cards_pending_idx
  on public.dp_cards (created_at) where status = 'pending';

-- Takedown looks a card up by its token hash.
create index dp_cards_deletion_hash_idx on public.dp_cards (deletion_hash);

-- ---------------------------------------------------------------- RLS ------
--
-- Deny by default and NO policy for anon or authenticated — not even for
-- approved rows. Everything goes through the route handlers with the service
-- role, so a card that is withdrawn or rejected stops being reachable the
-- moment its row changes, with no cached client-side query to outlive it.

alter table public.dp_cards enable row level security;

-- Organisers can see the queue, which is what makes review possible at all.
create policy "organisers read all dp cards"
  on public.dp_cards for select
  using (public.is_organiser());

comment on table public.dp_cards is
  'Community wall submissions. Nothing is public until a human approves it. See docs/backend/dp-gallery-contract.md and ADR 0021.';
