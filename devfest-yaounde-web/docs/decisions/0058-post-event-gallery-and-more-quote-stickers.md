# 0058 — The gallery button after the event, a fixed timezone bug, and a 4th testimonial sticker

Date: 2026-09-15
Status: Accepted — extends ADR 0056

## 1. The past gallery link names its year

`galleryCta` said "View the full gallery" with nothing to say WHICH edition
that was — confusing the moment a second album exists. It is now
`galleryCta` with a `{year}` param, reused for both buttons below rather than
two near-duplicate strings. `PAST_GALLERY_YEAR = EVENT.year - 1` in
`event.ts`: one year back from the confirmed edition, which is what "the
gallery" has always meant from an in-progress or upcoming edition's page. Not
a new admin field — `EVENT.year` already implies it in every normal year,
and a field asking an organiser to restate a number the calendar already
knows is a second place for that number to go stale.

## 2. A second album, and the CTA that only makes sense after the event

Two more settings fields, both inside the existing `site_settings.memory_lane`
jsonb column (no new migration — it already holds an arbitrary object):

- `currentGalleryUrl` — THIS edition's album, normally empty until an
  organiser uploads it after the event.
- Nothing new for "has the event ended" — that is computed, not stored (§3).

**Memory Lane** now shows up to two buttons: the past edition's (existing,
now OUTLINE/secondary — it used to be the only one, filled) and, once the
event has ended, the current edition's (NEW, FILLED/primary — it is what a
post-event visitor actually wants). With no current-year URL yet, the second
slot degrades to a plain, non-interactive "Photo album coming soon" notice
rather than a dead link.

**The hero's primary CTA swaps**, in the SAME slot rather than adding a
third button: before the event, "Grab your ticket" → `/tickets`, exactly as
before. Once `eventHasEnded()`, there is nothing left to sell a ticket to, so
the primary slot becomes the current-year gallery link (or the same "coming
soon" placeholder with no URL yet) — built on `Button`'s existing `disabled`
state, which is real non-interactive-button semantics rather than a styled
span pretending to be one. "Check the swag" is untouched: the shop is
evergreen (`ShopBrowser.tsx`'s own comment says so) and stays relevant either
side of the event. The navbar's own separate ticket link was deliberately
left alone — the brief named the hero's "Grab your ticket" button
specifically, and `/tickets` staying reachable post-event (to show whatever
sold-out/closed state the tiers themselves already carry) is a reasonable
default, not an oversight.

## 3. `eventHasEnded()`, and the timezone bug a test caught

Pure, `now` an argument — the same convention as `sponsorCallOpen` and
`cfsView`, so the public pages, the admin and the tests all reach the same
answer by calling the same function rather than each reading `Date.now()`.
`false` while the dates are unconfirmed, so an unset date can never be
misread as "the event is over."

**A real bug, caught by the test rather than reasoned past.** `eventDates()`
returns `end` as `"2026-11-28T18:00:00"` — no timezone suffix, which is
exactly right for embedding in `Event` JSON-LD (schema.org reads an
offset-less date-time as the VENUE's own local time, the correct read
there). Reusing that same string with `Date.parse()` for a runtime
comparison does something different: per spec, an offset-less date-time
parses as local time OF THE RUNNING PROCESS, not Yaoundé's. On a UTC server
that is a full hour off from the real 18:00 closing in Cameroon (UTC+1, no
DST). The first version of the test — asserting the exact closing second —
failed against the implementation, not the other way around. Fixed with a
small `eventEndInstant()` helper that appends the fixed `+01:00` offset
before parsing, used by both `eventHasEnded()` and the revalidation window
below.

**Not fixed, flagged instead:** `AdminOverview.tsx`'s own D-day countdown has
the identical bug (`new Date(dates.start).getTime()` on the same
offset-less string) — same root cause, pre-existing, unrelated to this
change, and left alone. Worth the same fix later.

## 4. Forcing the one rebuild this transition needs

Every public page is static and only regenerates on an explicit
`revalidatePath` (`src/lib/content/revalidate.ts`) — never on a timer, by
that file's own documented choice. `eventHasEnded()` flipping from false to
true is real state changing with nobody around to save anything and trigger
that call. Without a fix, the hero would keep offering tickets to an event
that already happened until the next unrelated admin edit happened to
revalidate `/`.

The existing cron sweep (`/api/cron/cleanup`, Supabase pg_cron every five
minutes plus a daily Vercel Cron backstop, ADR 0028) now also calls
`revalidatePath("/", "layout")`, gated to `withinPostEventRevalidateWindow()`
— the first 24 hours after the event's real close. A full day is deliberately
generous: this is a one-way switch, so the cost of checking a few hundred
extra times is nothing next to the cost of missing the one moment that
matters, and it comfortably covers the five-minute sweep having a bad day
with the daily backstop still getting at least one attempt inside the
window.

## 5. A 4th testimonial sticker, and two drawn for it

ADR 0056 picked three existing stickers (`bubble`, `spark`, `cup`) because
the sheet had no heart or thumbs-up. Asked for a 4th and for genuine
randomness rather than the same fixed three on every visit:

- **Two new shape stickers** in `src/lib/dp/stickers.ts` — `heart` and
  `thumbsup`. Same construction as the sheet's own existing marks: path data
  in a 100×100 box (the heart from two A-command arcs meeting at a point,
  the same technique as `pin`/`bubble`; the thumbs-up as three flat pieces —
  fist, wrist, bent thumb). Nothing in `compose.ts` changed — the sheet's own
  doc comment promises exactly that ("an entry in `SHAPE_STICKERS` and
  nothing else"), and it held. Both were checked by rendering actual SVG
  path previews before being written into the sheet, not eyeballed as
  strings, and confirmed again afterward through the real canvas pipeline
  (`drawStickerPreview`) with the ink-outline-and-shadow treatment every
  other sticker gets.
- **A 4th corner** — `bottomLeft`, mirroring `bottomRight`'s geometry, in
  `src/lib/quote-stickers.ts`.
- **Genuine randomness**: `pickQuoteStickers()` shuffles the five-sticker
  pool and assigns four, one per corner, without repeats — computed in an
  effect after mount (same pattern as `HeroStickers`), because `Math.random()`
  during render is a hydration mismatch waiting to happen. The four fixed,
  pre-measured corners stayed fixed on purpose: they are what earns the
  "never overlaps a quote" guarantee, and re-verifying that guarantee once
  per load instead of once per release was not worth the randomness it would
  add.
- A new `src/lib/random.ts` holds the shared `rand`/`shuffled` helpers this
  needed. `hero-stickers.ts` keeps its own inline copy — not touched, since
  refactoring tested, working placement code was not this change's job.

### Verified

- Six consecutive loads produced four distinct sticker assignments — the
  scatter is not silently deterministic.
- Re-measured clearance at 360–1920px, both locales, all three quotes, now
  against FOUR corners instead of three (new geometry the original version
  never had to clear): no overlap with any copy or dot control, no
  sticker-to-sticker overlap, nothing clipped, closest approach to text 20px.
- `heart` and `thumbsup` confirmed rendering correctly through the real
  pipeline, screenshotted together with the other two.
- 186 tests pass, including new property tests (200 rolls each) for the
  quote scatter — no repeats within an assignment, every slot filled within
  its declared tilt range — mirroring the existing hero-scatter tests' own
  "run over many rolls" convention rather than trusting one lucky roll.
- The hero/Memory Lane post-event states were exercised by temporarily
  pointing `EVENT_DATES` at a past year and, separately, forcing a
  current-year URL through `REPO_DEFAULTS` with Supabase disabled — both
  reverted before commit, neither ever touched the live database. Confirmed:
  the disabled "coming soon" hero button, the linked hero button opening the
  current album, and Memory Lane's outline-past / filled-current pair.
  Confirmed separately against the real, still-future 2026 dates that
  nothing changed there: "Grab your ticket" in both locales, no console
  errors.

## Consequences

- `currentGalleryUrl` starts empty in production — nothing was written to
  the live database. Every post-event surface shows "coming soon" until an
  organiser fills it in after the event, which is the correct and only
  honest state today.
- The cron route's job list grows to five; its existing `CRON_SECRET` gate
  and its append-only `result` shape are both unchanged, so nothing that
  already depends on that response shape needs to change.
- The DP generator's own sticker picker gains `heart` and `thumbsup` too, as
  a side effect of the sheet being genuinely one shared source — free
  variety there, not a scope increase anyone had to opt into.
