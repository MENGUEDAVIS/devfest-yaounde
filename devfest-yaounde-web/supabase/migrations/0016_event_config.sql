-- ============================================================================
-- 0016 — Call-for-speakers, sponsor call, and the legal links (ADR 0038)
--
-- Three things the organisers need to change without a deploy, and one of
-- them has a deadline attached:
--
--   * the call for speakers — where it points and when it closes. The
--     /speakers page shows an invitation instead of a lineup until somebody
--     is announced, and it has to stop inviting submissions the moment the
--     window shuts.
--   * the sponsor call — the prospectus, and whether the "become a sponsor"
--     CTA is still up.
--   * the legal links in the footer.
--
-- All nullable, all falling back to the repo, same rule as the rest of
-- site_settings: a fresh clone with no database still renders.
--
-- Stored as jsonb rather than eight flat columns because each of these is one
-- cohesive setting that is read and written together — a URL with no window,
-- or a window with no URL, is not a state the UI has any use for.
-- ============================================================================

alter table public.site_settings
  add column if not exists cfs          jsonb,
  add column if not exists sponsor_call jsonb,
  add column if not exists legal        jsonb;

comment on column public.site_settings.cfs is
  'Call for speakers: { url, opensAt, closesAt, override }. override forces the CFS view on/off regardless of whether speakers exist. See ADR 0038.';

comment on column public.site_settings.sponsor_call is
  'Sponsor call: { prospectusUrl, enabled, closesAt }. Drives the "become a sponsor" CTA.';

comment on column public.site_settings.legal is
  'Footer legal links: { participationTermsUrl, privacyUrl, termsUrl }.';

-- ---------------------------------------------------------------------------
-- Seed the row with the values the chapter published, so the dashboard has
-- something real to edit rather than empty fields someone has to fill from
-- memory. `on conflict` leaves an existing row's own values alone — this is
-- a seed, not a reset, and re-running the migration must not clobber an
-- organiser's edit.
--
-- Times are stored as UTC instants. WAT (Africa/Douala) is UTC+1 year-round
-- with no daylight saving, so 01:00 WAT is 00:00Z and 23:59 WAT is 22:59Z.
-- Written as explicit offsets rather than a bare timestamp so the intended
-- wall-clock time survives being read in another zone.
-- ---------------------------------------------------------------------------

insert into public.site_settings (id, cfs, sponsor_call, legal)
values (
  'site',
  jsonb_build_object(
    'url',      'https://sessionize.com/devfest-yaounde-2026',
    'opensAt',  '2026-09-05T01:00:00+01:00',
    'closesAt', '2026-10-31T23:59:00+01:00',
    'override', 'auto'
  ),
  jsonb_build_object(
    'prospectusUrl', 'https://drive.google.com/file/d/1Bof8zhqp5aOtweXL_qmXXGAvyGb1VAAQ/view?usp=sharing',
    'enabled',       true,
    'closesAt',      null
  ),
  jsonb_build_object(
    'participationTermsUrl', 'https://gdg.community.dev/participation-terms/',
    'privacyUrl',            'https://policies.google.com/privacy',
    'termsUrl',              'https://policies.google.com/terms'
  )
)
on conflict (id) do update set
  cfs          = coalesce(public.site_settings.cfs,          excluded.cfs),
  sponsor_call = coalesce(public.site_settings.sponsor_call, excluded.sponsor_call),
  legal        = coalesce(public.site_settings.legal,        excluded.legal);
