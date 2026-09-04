# 0037 — The wall stores WebP, so the cards keep their corners

Date: 2026-09-04
Status: Accepted — supersedes the flatten-onto-paper fix in `cbe8a6c`

## Context

A generated card has fully transparent corners: `geometry.ts` draws it inside
a clipped rounded rect, so the four corners are alpha, not a colour.

The wall stored JPEG. JPEG has no alpha channel, so every stored card had its
corners composited onto **something**, and every encoder — sharp and browser
canvas alike — composites onto **black** when not told otherwise. Every face
on the wall was framed in black.

That was fixed by flattening onto the site's paper neutral (`#F0F0F0`) before
encoding. It removed the black. It also **baked a colour into the card**: the
corners were now a pale rectangle, correct only as long as the wall behind
them stayed exactly that shade.

Observed on 2026-09-04, and correctly diagnosed by the person reporting it:
_"The downloaded DP card is a png and the saved one is a jpg. I guess that's
why we got the colored borders/edges."_ Exactly so — the download looked right
and the wall copy did not, because they were different formats and only one of
them could carry the corners.

## Decision

**Store WebP.** It carries an alpha channel, so there is nothing to flatten
and nothing to bake. A card sits on whatever the wall is painted, the way the
PNG download always did.

- The server re-encode drops `.flatten()` and emits
  `webp({ quality: 92, alphaQuality: 100 })`. **Quality, not `lossless`** —
  these are photographs, and a lossless card runs several times larger for a
  difference nobody can see on a wall tile. `alphaQuality: 100` keeps the one
  channel that has to be exact: a soft alpha edge is a visible halo.
- The client's wall copy stops filling the canvas before drawing. A browser
  too old to encode WebP from a canvas returns PNG instead, which also carries
  alpha and which the server re-encodes anyway.
- The incoming byte cap rises from 400 KB to 2 MB, because that PNG fallback
  is legitimately larger. **The dimension cap does not move** — 800px is the
  control that stops a full-resolution face being smuggled in; bytes only
  bound the request.
- Migration `0015` widens the bucket's `allowed_mime_types`, which was
  `image/jpeg` and would have refused every upload the moment the encoder
  changed. Both types stay allowed: objects written before this are JPEG and
  keep being served, because a row keeps the path it was stored with rather
  than one recomputed at read time.

## Consequences

- **Cards already on the wall do not improve.** The black, or the paper, is
  inside those files. Nothing re-encodes it out. They have to be deleted and
  re-submitted — which is now possible, because an organiser can finally
  delete a card (see below).
- `storagePath` emits `.webp`. Old `.jpg` paths resolve unchanged.
- The test that guarded this changed its claim rather than its expectation.
  It used to assert the corners came out paper-coloured; it now asserts they
  come out **transparent**, and that the middle of the card survived — so it
  cannot pass by producing an empty image.
- WebP is supported by every browser this site targets. It is also smaller
  than the JPEG it replaces at the same visual quality, so the wall loads
  faster, which matters for a page that shows dozens of cards at once.

## The related bug this exposed

Deleting a card from the admin never worked. `DELETE /api/dp/gallery/:id`
required the submitter's takedown token, which an organiser cannot hold, so
the admin's trash button fell back to `PATCH { status: "rejected" }` — which
removes the **image** and keeps the **row**. The card came straight back into
the admin grid on the next load, now with nothing to show but a background
colour, and no number of presses would shift it.

`DELETE` now accepts an organiser session as an alternative proof, and audits
it. A takedown by the person in the photograph is still unaudited on purpose:
that is someone exercising a right, and logging who removed themselves would
keep a record of exactly the person who asked to stop having one.
