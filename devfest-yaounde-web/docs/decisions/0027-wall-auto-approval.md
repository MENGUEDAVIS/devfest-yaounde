# 0027 — The wall publishes without review

Date: 2026-09-03
Status: Accepted — amends `0026`

## Context

`0026` built the wall review-first: cards landed `pending` and an organiser
approved them. That followed the contract, which says "nothing is public until
a human says so".

Asked for on 2026-09-03, and reaffirmed after the consequence was stated:
**nobody should have to press anything for cards to appear.** The concern was
time — a queue nobody works means an empty wall, which is worse than no wall.

That is a fair reading. A review step that does not happen is not a safeguard,
it is a stalled feature.

## Decision

New cards land `approved`. `DP_GALLERY_REVIEW=1` restores the queue without a
code change.

**What this costs, stated plainly:** photographs of faces become public with
nobody having looked at them. Protection moves from _before_ publication to
_after_ it. That is the trade, and it was made deliberately.

**What is kept, because it costs nobody any time:**

- **Takedown by the submitter**, through the token their browser holds.
- **Retro-moderation.** `PATCH /api/dp/gallery/:id` with `rejected` still
  works and still _deletes_ the image. The organiser endpoints were not
  removed — they change from a gate into a remedy.
- **Retention**, 200 days, purged by the cron.
- **Every check on the bytes**: decoded not trusted, dimension-capped,
  re-encoded, private bucket, signed URLs.

**The copy was changed in the same commit**, and that was not optional. The
screen said "it appears on the wall once the team has reviewed it" in both
languages. Shipping auto-approval without touching that would have made the
site lie to the person handing over their photograph. It now says the card is
on the wall, and that a takedown can be asked for at any time.

The POST response carries the real status, and the screen reads it. Whichever
mode a deployment runs in, the message matches what happened.

## Consequences

- **Someone still has to watch the wall**, just not before each card. The
  difference is that a problem is now found by whoever notices it rather than
  by a reviewer, and the response is a rejection that deletes the image.
- The instruction from the contract stands and is now harder to honour: **do
  not publish cards of children.** With no review, nothing enforces it. If a
  card of a child appears, it has to be taken down by someone who sees it.
- Reverting is one environment variable, not a deploy.
- `dp_cards.reviewed_by` stays null on auto-approved rows. That is honest: no
  one reviewed them, and the record should not suggest otherwise.
