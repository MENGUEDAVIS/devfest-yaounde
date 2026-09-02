# 0020 — Rendering the badge QR code

- **Status:** Accepted (2026-09-02)
- **Date:** 2026-09-02

## Context

Every ticket carries a `badge_code` of the form `DFY-XXXXX-XXXXX`, derived
server-side from `BADGE_CODE_SECRET`. `docs/guides/frontend-integration.md`
asks for it to be rendered **as a QR and as readable text**, and the organiser
scanner posts a scanned code to `/api/check-in`.

The readable text is shipped: it is on the confirmation screen and in
`/account`, deliberately large and selectable. **The QR is not**, because
drawing one needs a decision this phase is not allowed to take alone.

## The options

**A. Add a QR library.** `qrcode` (MIT, ~50 KB, no runtime dependencies) or
`qrcode.react`. One import, correct output, actively maintained.

**B. Hand-roll an encoder.** A QR encoder is Reed–Solomon error correction,
mode selection, mask evaluation and version sizing — several hundred lines of
bit manipulation with no partial credit. A subtly wrong encoder produces a
code that _looks_ like a QR and scans to garbage, which would be discovered at
the door on the day.

**C. An external image service** (`api.qrserver.com` and similar). Rejected
outright: it sends every attendee's badge code to a third party, and the code
is the credential that gets them in. It would also fail on venue Wi-Fi, which
`docs/setup/remaining-work.md` already flags as unreliable.

## Recommendation

**Option A.** The failure mode of B lands on attendees at the door, and C
leaks the credential. A small, single-purpose, dependency-free library is the
proportionate answer.

## Decision

**Option A, approved 2026-09-02.** `qrcode` is installed and renders the
badge QR.

## The readable code stays

The QR is drawn **alongside** the badge code as large, selectable text, not
instead of it. That is not redundancy: a cracked screen, a dead battery or a
scanner that will not focus still has to get someone in, and the door staff
can type the code. `docs/guides/frontend-integration.md` asks for both for
exactly this reason.

## Notes for whoever uses this next

- Rendering happens **client-side, into a canvas**. The badge code is the
  credential that admits someone, so it is never sent anywhere to be turned
  into an image.
- Error-correction level **M** is the default and is right here: the code is
  short, and a higher level would make the modules smaller on a phone screen
  for no real gain.
- This also unblocks the organiser check-in scanner, which needs to read the
  same codes.
