-- ============================================================================
-- 0015 — The wall stores WebP, so the bucket has to accept it
--
-- A card's corners are transparent by construction. JPEG has no alpha, so
-- every stored card had its corners composited onto something — black until
-- 0aecb75, paper afterwards, and neither is the card that was composed.
-- WebP carries alpha, so nothing is baked in and the card sits on whatever
-- the wall is painted.
--
-- The bucket was created accepting `image/jpeg` and nothing else, which would
-- refuse every upload the moment the encoder changed. Both types stay allowed:
-- the objects written before this are JPEG and go on being served, because a
-- row keeps the path it was stored with rather than one recomputed at read
-- time.
--
-- The size limit goes up because it applies to the object being written, and
-- a high-alpha-quality WebP of a photographic card can pass 400 KB. Still
-- small enough that a wall tile is not a download.
-- ============================================================================

update storage.buckets
set
  allowed_mime_types = array['image/webp', 'image/jpeg']::text[],
  file_size_limit = 1048576
where id = 'dp-cards';
