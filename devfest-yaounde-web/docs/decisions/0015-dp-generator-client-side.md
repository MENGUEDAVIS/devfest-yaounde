# 0015 — The DP generator never uploads a photo

Date: 2026-08-31
Status: Superseded by 0034

## Context

Two documents described the DP generator differently.

`PAGES.md` §9 asks for "canvas compositing… keeping it fast and
dependency-light", with no login and no dependency on the rest of the site's
auth. `docs/setup/security-checklist.md` and the `devfest-security` skill both
carry an "Uploads (DP Generator)" section requiring server-side file-type and
size validation, EXIF stripping before storing or serving, and rate limiting.

Those are not two views of one architecture. The checklist assumes photos
reach a server; the pages guide assumes they never do. It had to be settled
before either could be implemented.

## Decision

**The photo never leaves the device.** The file is read with
`createImageBitmap`, composited onto a canvas, and downloaded — entirely in the
browser. There is no upload endpoint, no bucket, and no server-side copy.

`src/lib/dp/` contains the whole feature: `frames.ts` (the branded frame
catalog), `compose.ts` (the canvas compositor) and `share.ts` (Web Share API
with a clipboard fallback).

On the frame shape: `PAGES.md` §9 calls for the morphed-shape motif, but
`DESIGN.md` §4.2 carries a standing instruction not to fake it until the real
asset is supplied — "a correct, honest plain rounded rectangle is far better
than a broken attempt at the signature shape." The frames therefore use clean
rounded rectangles and circles. `DpMask` is the one place to extend when the
real asset arrives.

## Consequences

- **The upload section of the security checklist no longer applies**, because
  its entire threat surface is gone. Nothing to validate server-side, no EXIF
  to strip, no retention policy, no upload rate limit, no storage bill. The
  checklist should be annotated rather than silently ignored.
- The file-type and size checks in `loadPhoto` are UX guards, not security
  controls. A malformed file can only spoil the user's own render. They are
  labelled as such in the code so nobody later mistakes them for a boundary.
- **No public gallery of generated DPs is possible** without reversing this
  decision. That would reintroduce uploads and every requirement above — it
  should be a new decision record, not a quiet feature addition.
- No usage analytics on DPs generated, since nothing reaches a server.
- Requires `createImageBitmap` and canvas — fine on every current mobile and
  desktop browser, but the feature genuinely cannot work with JavaScript off.
- Renders happen on the visitor's device, so a very large photo on a low-end
  phone is their CPU, not ours. Output is capped at 1080×1080.
