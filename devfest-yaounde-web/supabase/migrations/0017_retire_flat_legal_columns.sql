-- ============================================================================
-- 0017 — One home for the legal links, and no code of conduct (ADR 0040)
--
-- `site_settings` carried the same two facts twice: `privacy_url` and
-- `coc_url` from 0011, and then `legal` from 0016 holding participation
-- terms, privacy AND terms of service. Two writable homes for one link is the
-- shape of a bug nobody notices until the footer and the dashboard disagree.
--
-- `legal` wins: it holds all three, it is what the footer reads, and the
-- third link had nowhere to live in the flat pair.
--
-- The code of conduct is gone entirely, and that is a DECISION, not a
-- cleanup. The chapter runs under GDG's participation terms — that is what
-- its own Bevy page links — so the site names and links that document rather
-- than promising a second one it does not have. Confirmed by the organisers
-- on 2026-09-08.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Backfill BEFORE dropping, in the same transaction.
--
-- Anything an organiser typed into the old fields moves into `legal` rather
-- than going over the side with the columns. The coalesce chain reads
-- right-to-left in priority: a value already in `legal` is the newer one and
-- is kept; the old column fills a gap; the published default fills what is
-- left. `coc_url` lands on participationTermsUrl because that is now what
-- that link is — anyone who set it was pointing at conduct rules.
-- ---------------------------------------------------------------------------

update public.site_settings set legal = jsonb_build_object(
  'participationTermsUrl', coalesce(
    nullif(legal ->> 'participationTermsUrl', ''),
    nullif(coc_url, ''),
    'https://gdg.community.dev/participation-terms/'
  ),
  'privacyUrl', coalesce(
    nullif(legal ->> 'privacyUrl', ''),
    nullif(privacy_url, ''),
    'https://policies.google.com/privacy'
  ),
  'termsUrl', coalesce(
    nullif(legal ->> 'termsUrl', ''),
    'https://policies.google.com/terms'
  )
)
where id = 'site';

alter table public.site_settings
  drop column if exists coc_url,
  drop column if exists privacy_url;

comment on column public.site_settings.legal is
  'The ONLY home for the footer legal links: { participationTermsUrl, privacyUrl, termsUrl }. There is deliberately no code-of-conduct field — the participation terms are that document for this chapter (ADR 0040).';
