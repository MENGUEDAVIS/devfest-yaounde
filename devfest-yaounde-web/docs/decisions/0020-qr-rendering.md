# 0020 — Rendering the badge QR code

- **Status:** PROPOSED — needs a decision before the QR can be drawn
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

## Why this is not already done

Adding a frontend dependency requires an ADR and an explicit go-ahead
(PHASE14 standing rules). This record is the proposal; the decision is the
human's.

## What ships until then

The badge code renders as large, selectable text everywhere it appears. That
is not a placeholder — the guide requires it regardless, precisely because a
cracked screen or a dead battery still has to get someone in. What is missing
is the convenience of scanning, not the ability to enter.
