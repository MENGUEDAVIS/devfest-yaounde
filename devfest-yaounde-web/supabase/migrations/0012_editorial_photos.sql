-- ============================================================================
-- 0012 — Public bucket for organiser-uploaded editorial photos (ADR 0032)
--
-- Speakers, team, sponsors (and product shots) are meant to be on the public
-- site, so this bucket is public. Writes still go through the organiser
-- routes with the service role — there is no insert policy for anon.
-- Bytes are re-encoded before they land here (EXIF stripped).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editorial',
  'editorial',
  true,
  2621440,
  array['image/jpeg']::text[]
)
on conflict (id) do nothing;

drop policy if exists "public can read editorial images" on storage.objects;
create policy "public can read editorial images"
  on storage.objects for select
  using (bucket_id = 'editorial');
