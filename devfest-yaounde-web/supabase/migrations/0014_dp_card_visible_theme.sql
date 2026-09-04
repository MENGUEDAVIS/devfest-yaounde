-- ============================================================================
-- 0014 — visible flag + theme on dp_cards (ADR 0034)
--
-- Phase 18 stores a composed card on download/share/copy. `visible` is how
-- an organiser hides one without destroying the file (the B9 click-toggle).
-- `theme` is the frame id chosen in the generator — language-neutral.
-- A takedown by the submitter still DELETES; this column is the reversible
-- hide.
-- ============================================================================

alter table public.dp_cards
  add column if not exists visible boolean not null default true;

alter table public.dp_cards
  add column if not exists theme text not null default '';

comment on column public.dp_cards.visible is
  'Public wall filter. Default on. Organiser toggle; submitter takedown still deletes.';

comment on column public.dp_cards.theme is
  'DP frame id at save time. Empty on cards saved before 0014.';

create index if not exists dp_cards_visible_idx
  on public.dp_cards (created_at desc)
  where visible and status = 'approved';
