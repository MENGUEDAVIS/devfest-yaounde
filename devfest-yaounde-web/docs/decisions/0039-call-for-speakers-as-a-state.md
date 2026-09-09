# 0039 — The call for speakers is a state, not a page

Date: 2026-09-08
Status: Accepted

## Context

There are no speakers. There will not be until the Sessionize call closes on
31 October, and that is normal — the site is live nine weeks before anybody
has been accepted.

Three surfaces have to say something about speakers in the meantime: the home
page section, `/speakers`, and the announcement banner (which has nothing to
sell, since tickets are not open). Before this, all three did the same thing:
nothing. The home section returned `null`, the speakers page rendered an empty
browser, and the banner ran a generic line.

That is a site telling visitors the least interesting true thing at the exact
moment it most needs to ask them for something.

## Decision: one pure function decides, everywhere

`src/lib/content/cfs.ts` exports `cfsView(settings, speakerCount, now)`
returning one of four states:

| State     | Means                              | Surfaces show          |
| --------- | ---------------------------------- | ---------------------- |
| `lineup`  | there are speakers                 | the grid / the reel    |
| `open`    | no speakers, call running          | the invitation + count |
| `waiting` | no speakers, call has not opened   | "opens soon"           |
| `closed`  | no speakers, call has run and shut | "submissions are done" |

It is a function of three arguments and nothing else — no fetch, no clock it
reaches for itself, no React. That is what makes it testable (`now` is an
argument, so the whole window is exercised in-process) and what makes the four
surfaces agree. A rule re-derived per component is a rule that drifts, and
this one has to be identical in the banner and on the page it links to.

### Precedence, in the order it is checked

**The override wins outright, before the speaker count is even read.** It has
to: the two cases it exists for are precisely the ones where the automatic
rule is confidently wrong — a lineup announced before it is entered here, and
a call reopened after the first speaker landed.

**A missing window bound means "no bound", not "closed".** An organiser who
clears the close date is saying "open until I say otherwise", and reading an
empty field as a shut door would silently delete the invitation.

**`force-off` collapses to `lineup`, not to a fourth kind of hidden.** With no
speakers that renders as nothing at all, which is what "never show the call"
means, and it keeps the state enum describing the site rather than the switch.

## The banner: the dashboard always wins

The banner carries the call only when there is genuinely something to click —
`state === "open"` **and** a non-empty URL — and only when no announcement has
been typed in the dashboard.

If an organiser has written a line, that is the thing they wanted said today.
Replacing it with our own would be the site overruling them, and hanging a
"Submit" button off the side of an unrelated sentence is worse: it implies the
sentence is about submitting.

The CTA sits **outside** the marquee track. A link that slides past is a link
you have to chase — a poor target on a phone and an unreachable one for anyone
who cannot move a pointer quickly. It is hidden below `sm`, where the message
already fills the strip and a button would crush it.

## The countdown renders as nothing on the server

A countdown is the one thing on a page that cannot be prerendered honestly:
the HTML would cache "3 days left" and serve it to somebody reading it a week
later. So the server paints the deadline **in words** — a full date, pinned to
`Africa/Douala` — and the ticking version replaces it once there is a clock.

Under `prefers-reduced-motion` it shows days remaining and stops. A number
changing every second is motion; someone who asked for less of it has not
asked for less information. The ticking list is `aria-hidden` either way — a
screen reader announcing a re-rendering seconds field is unusable — and the
sentence beside it carries the same fact.

## Admin datetimes are Yaoundé wall-clock

`datetime-local` reads and writes the _browser's_ local time. The deadline is
"31 October, 23:59, Yaoundé" — that is the sentence on the public page and the
number in the organisers' heads.

So `isoToWatLocal` / `watLocalToIso` convert against a fixed `+01:00` rather
than the machine's zone. Cameroon has no daylight saving, so the offset is a
constant and the conversion is exact, not approximate. An organiser editing
from anywhere types the number they mean.

The panel also states what the public site is doing right now, computed by
calling `cfsView` itself. A settings screen that describes its rules in prose
is a settings screen that goes out of date.

## Consequences

- `loadSettings` and `loadCollection` are wrapped in React `cache`. The layout
  and the page both need the settings now, and the speaker list is read as
  both a grid and a count. It is **per-request** memoisation and deliberately
  does not survive the request: a dashboard save must show on the next load.
- The home section's `return null` is no longer the empty-store path. It now
  only catches `force-off` with an empty list, where rendering nothing is
  exactly what was asked for.
- Eleven tests cover the state machine and the timezone round-trip. Neither
  needs a database or a browser, because neither touches one.
- **Not built: a submission form of our own.** Sessionize is where the call
  lives, it is where reviewing happens, and a second front door would mean
  reconciling two lists of proposals by hand.
