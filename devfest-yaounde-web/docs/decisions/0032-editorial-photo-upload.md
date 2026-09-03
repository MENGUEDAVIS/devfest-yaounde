# 0032 — Editorial photos are uploaded by hand, after the sheet

Date: 2026-09-04
Status: Accepted — amends `0031`

## Context

`0031` stored collections as JSON but left photo URLs as paths: "uploading
images is not this work." Organisers import a sheet of names first. The
pictures arrive later, one profile at a time, often from a phone at the venue.

A single ZIP of photos named by id would be faster and easier to get wrong —
a mismatched filename silently puts the wrong face on a speaker. Manual
attach-to-row is slower and is the face you meant.

## Decision

**Two steps, in that order.**

1. Publish the collection (JSON, or a speakers/team CSV of basic fields).
   `photoUrl` may be empty. Existing photos are kept when the sheet leaves
   the column blank, so re-importing names does not wipe pictures.
2. The dashboard lists every remaining profile without a real picture
   (empty, `#`, or a `/placeholders/` path). The organiser picks a file per
   row.

Bytes go to a **public** Storage bucket `editorial`, path
`{collection}/{id}.jpg`. They are decoded and re-encoded as JPEG first
(EXIF stripped, longest edge 1600). The public URL is written onto the
entry and the collection is saved. Replacing a photo is the same upload
with `upsert`.

Writes stay organiser-only through `POST /api/admin/content/:id/photo`.
There is no insert policy on the bucket for `anon`.

## Consequences

- The public site can `<img src>` the URL directly (`img-src https:` already
  allows it). No signed URL, because these pictures are supposed to be
  public.
- A CSV of names can land before a single photo exists.
- Product images use the same path, written as `images[0]`.
