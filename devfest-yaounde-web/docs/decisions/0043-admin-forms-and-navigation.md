# 0043 — The form absorbs the two-step, and the sidebar stops scrolling

Date: 2026-09-09
Status: Accepted

More findings from using the dashboard for real, plus the navigation changes
they prompted.

## The drawer jumped when you touched a toggle

`Toggle` and `Segmented` hide their real `<input>` with `sr-only`, which is
`position: absolute`. Neither label was positioned, so those inputs anchored
to the nearest positioned ancestor — **the drawer panel** — and sat at its
top-left corner while their switch was drawn hundreds of pixels further down.

Clicking a switch focused an element the browser then scrolled into view,
yanking the scroll container and making the whole drawer appear to resize and
the form to shrink.

`relative` on each label. The input lands where it looks like it is, and the
browser has nothing to scroll to.

While there: the radio groups were named `` `speaker-day-${draft.id || "new"}` ``.
The id is slugified from the name as you type, so the group's `name` changed
on every keystroke — a radio group that keeps re-forming under the pointer.
The drawer holds one record at a time, so there is nothing to disambiguate and
the name is now a constant.

## A photo could not be added until after saving

The upload endpoint attaches a picture to an entry by id, so the entry has to
exist. The form exposed that constraint directly: the button was disabled on a
new record and said so. Which meant filling in a speaker, saving, finding them
in the list, reopening them, and only then adding a face.

**Nobody thinks of a person and their photograph as two separate errands.**

The constraint is real and unchanged; what changed is who absorbs it. A picked
file is now held in the form and previewed immediately, and saving does both
things in the order the server needs: write the record, then attach the photo
to the record that now exists (`afterSave`).

Three details that matter more than they look:

- **The object URL is created and revoked in the event handler**, never in
  render or an effect. `createObjectURL` allocates; doing it while rendering
  leaks a blob per render, and doing it in an effect means a `setState` in an
  effect body. A click is the right place. The previous URL is revoked before
  a replacement, so picking four photos holds one blob.
- **`EntityCrud` re-reads the collection after `afterSave`.** The upload
  writes `photoUrl` onto the record server-side, so the local `rows` and
  `baseline` are behind. Without the re-read the list shows no picture and
  the _next_ save either blanks the photo or trips the concurrency guard as
  somebody else's edit. One loses the upload.
- **The two outcomes are reported separately.** If the record saves and the
  photo fails, it says exactly that — "the record saved, but the picture did
  not upload" — rather than one verdict for two operations.

## Filtering had a data-loss trap in it

The obvious way to add a filter is to narrow `rows` before passing them to
`EntityCrud`. That would have been a bug with teeth: **every save writes the
whole array** (ADR 0031), so one search, one edit, and everybody who did not
match is deleted.

So `filter` is a prop that reaches the render and nothing else. `rows` stays
whole for every save; only what is displayed is narrowed.

**Reordering hides itself while a filter is active.** The arrows swap a row
with its neighbour _by index_, and under a filter the row above on screen is
not the row above in the array — "move up" would jump over however many rows
are hidden and silently write the wrong order.

Speakers filter by name, company or id plus day and featured; Team by name,
role (both languages) or id plus current/past. Deliberately small: these lists
are tens of records, and the job is "find the one I came here to edit".

## The sidebar is an accordion now

Thirteen views in five groups does not fit a laptop sidebar, and the previous
answer was to let it scroll — which hides half the dashboard behind a gesture
and gives no sense of what else is there.

One group open at a time, so the list stays about as tall as the screen.
**A single-item group is not a group**: "Overview" as a disclosure that
reveals one thing is two clicks for what should take one, so it renders as a
plain item.

The open group is **seeded from the view, not hardcoded to the first**.
Landing on `?view=speakers` opens Content with Speakers marked, rather than
opening Commerce and leaving the current page invisible. With no `?view=` that
resolves to the topmost group, which is the "first one open" behaviour asked
for. Collapsed groups are `inert`, so their buttons are not tabbable from a
menu showing nothing.

## Who is signed in, pinned

The organiser's email was at the top, above a nav that scrolls — so on a short
window it was the first thing to go. It is the answer to "whose audit trail is
this about to be", which is worth keeping in view while editing, so it now
sits outside the scrolling area at the foot of the sidebar with the way back
to the site.

## A scrollbar that appears when it is doing something

The sidebar's gutter is transparent until it scrolls, then fades back out
about a second after the last movement.

**Not `scrollbar-width: none`.** Hiding it outright takes it away from anyone
who drags a scrollbar, and a menu you cannot drag-scroll is worse than one
with a visible gutter. `scrollbar-color` and the WebKit pseudo-elements say
the same thing twice because neither is supported everywhere — and the
fallback in both directions is an ordinary scrollbar, which is fine. Under
reduced motion the scrollbar still appears; it just does not fade.

## Discount codes read at a glance

Active and disabled differed by one word — "Yes" or "No" — in a table of
words you are scanning for the one code you came to switch off. Now: a
coloured pill with a dot (so it survives red/green colour blindness), and a
struck-through code when it is retired.

**The button is coloured by what it DOES, not by the row's state**: red to
take a code out of service, green to put one back. Colouring it to match the
row would mean the red button sometimes enables things, in a list where both
buttons sit inches apart.

## Hiding a person instead of deleting them

Taking somebody off the public site meant deleting their record — a speaker
who withdrew, an organiser not announced yet — and typing it all back in if
they returned. That is how records get lost.

`hidden?: boolean` on `Speaker` and `TeamMember`, flipped from a button on the
listing row. **Optional, and absent means visible**, so every record written
before this field existed is still valid and still shown.

### The default read is the safe one

There are seven public surfaces reading speakers alone — home, `/speakers`,
`/schedule`, the schedule preview, the layout's banner count. A filter applied
at each of them is a filter somebody forgets on the eighth, and the failure is
silent: a person who asked to come off the page is still on it.

So **`getSpeakers()` and `getTeam()` now return only visible people**, and the
dashboard — the one caller that genuinely wants everything — says so with
`getAllSpeakers()` / `getAllTeam()`. Reaching for the obvious name has to be
the thing that does not leak.

That has a knock-on the state machine gets right for free: a lineup where
every speaker is hidden reads as an empty lineup, so the site shows the call
for speakers rather than a blank section (ADR 0039).

### The toggle saves through `commit`

Not its own `fetch`. It goes through the same whole-array write, concurrency
check, error toast and rollback as every other save — a view flipping a
boolean and PUTting on its own would be a second, quieter write path with none
of that.

### CSV re-import does not un-hide

`hidden` is not a CSV column, so rebuilding a record from the sheet alone
would put somebody back on the public site without anybody choosing to — the
exact opposite of what hiding them was for, and silent. It is carried over
like `featured`, `alumni` and the photo already were. A test pins it.

## Consequences

- Verified: lint, typecheck, 162 tests, build. **Not verified in a browser** —
  the drawer jump in particular was diagnosed from the CSS and reproduced by
  reasoning, not by watching it.
- `ImageField`'s `disabled`/`disabledHint` props still exist and are unused by
  the three photo forms. Left in place: the next form that genuinely cannot
  accept a file yet should say so rather than reinvent it.
