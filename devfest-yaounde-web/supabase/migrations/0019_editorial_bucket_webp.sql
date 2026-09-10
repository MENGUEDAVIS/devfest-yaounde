-- ============================================================================
-- 0019 — The editorial bucket only accepted JPEG, and the hero backdrop is
-- WebP
--
-- Same mistake as 0015, in the same bucket family, for the same reason.
-- `editorial` was created in 0012 accepting `image/jpeg` and nothing else —
-- correct at the time, because `normalisePhoto` (speakers, team, sponsors)
-- only ever encoded JPEG.
--
-- ADR 0047 added `normaliseBackdrop` for the landing hero, deliberately
-- encoding WebP instead: JPEG has no alpha channel, so a backdrop with a
-- transparent cut-out would have had every transparent pixel composited onto
-- a flat colour by the encoder — the same class of bug 0015 fixed on the
-- wall, in the one place on the site that most depends on the theme showing
-- through. That decision was made without touching this bucket's allow-list,
-- so Supabase Storage rejected every upload outright: `storePhoto` threw,
-- the route's own catch turned it into a 500, and the admin's error message
-- ("That image did not upload") gave no reason why, because the client never
-- learns more than the status code.
--
-- Both types stay allowed, exactly as 0015 kept both for the wall: existing
-- speaker, team and sponsor photos are JPEG and are served by the path they
-- were written with, not recomputed at read time.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/webp']::text[]
where id = 'editorial';
