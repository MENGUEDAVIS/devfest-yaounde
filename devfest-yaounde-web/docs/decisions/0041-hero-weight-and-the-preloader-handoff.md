# 0041 — A lighter hero, and a splash that actually hands over

Date: 2026-09-09
Status: Accepted

## The entrance was playing to an empty room

The hero's arrival is a chain of CSS animations with staggered delays: the
logo row, two masked headline lines, the stamp landing, the tagline, the
ticket stub, the buttons, the collage tiles. They started **at first paint**.

The preloader holds the screen for 1300ms and then fades for 320ms.

So the entire choreography ran behind an opaque yellow screen and was over
before anybody saw it. What a visitor actually got was a splash, and then a
static page — the two most expensive pieces of motion on the site cancelling
each other out.

**Fix: `animation-play-state: paused`, gated on the preloader's own state.**

```css
html:has([data-preloader="held"]) .anim-hero-rise,
html:has([data-preloader="held"]) .anim-tile-in,
html:has([data-preloader="held"]) .anim-stamp,
html:has([data-preloader="held"]) .mask-line > * {
  animation-play-state: paused;
}
```

These animations already use `both` fill, so a paused animation sits in its
`from` keyframe through its delay and resumes from there. The preloader
switches its attribute from `held` to `leaving` when it starts fading, the
selector stops matching, and every element resumes at once — each keeping its
own stagger, so the sequence plays _as_ the splash lifts.

Deliberately not a timer. A duplicated `HOLD_MS` in a stylesheet and a TS file
is two constants that will drift the first time somebody tunes one.

**It fails open.** No preloader in the document — any other page, a client-side
navigation, a build without it — means nothing matches and the hero animates
normally. Nothing here can leave content stuck invisible, which is the failure
mode that matters for an entrance animation.

## Eighteen tiles of four pictures

The backdrop repeated a four-image array five times and sliced it to 18 cells.
Eighteen `<img>` elements, eighteen staggered entrance animations, and the
same four pictures on screen three times each — behind two scrims that hide
most of them anyway.

**Six tiles, one grid shape per breakpoint, no hidden cells.** At this size
the collage is texture, not content: nobody studies it, and more of it is not
more atmosphere. Six is enough for the tilt pattern to read as pinned prints
without repeating a photo on the same screen.

The fill logic changed with it. `Array.from({length: 6}, (_, i) => photos[i %
photos.length])` uses each photo once when there are six or more and only
wraps when there are fewer — where the old slice-and-repeat duplicated
unconditionally.

Six cells at _every_ width, so nothing is downloaded and then hidden by a
media query.

## `next/image`, and the guard around it

`images.remotePatterns` is derived from `NEXT_PUBLIC_SUPABASE_URL` rather than
typed out again: one project, one place to change it. An unset or malformed
URL yields an **empty** list, not a wildcard — `next/image` then refuses every
remote host, which is a broken image in development and the correct failure.
A wildcard would be an open image proxy resizing anything on the internet at
our expense.

### The guard is the important half

**`next/image` throws on a host missing from `remotePatterns`, and it throws
while rendering.** One bad row does not show one broken picture; it returns a
500 for the whole page.

And a bad row is reachable: the CSV import accepts a free-text `photoUrl`
(`SPEAKER_CSV_SPEC`), so a pasted spreadsheet linking somebody's own site is
enough. `canOptimise(url, host)` in `src/lib/images.ts` decides — relative
paths always, HTTPS on exactly the configured host, nothing else — and
`ContentImage` falls back to a plain `<img>` when it says no. Unoptimised is a
worse picture; a throw is no page. Six tests pin it.

`SponsorStrip` keeps a plain `<img>` for the same reason taken further: logo
URLs are the least controlled in the store, logos are small, and they are
frequently SVG, where the optimiser has nothing to win.

### SVG is passed through, not optimised

`dangerouslyAllowSVG` stays **off** — it would let `/_next/image` serve
arbitrary SVG, which can carry script. The placeholder art is SVG, so those
get `unoptimized`: they are 500 bytes each and a round-trip would make them
slower, not faster.

### No blur placeholders, and why

`placeholder="blur"` needs a `blurDataURL` per image. A remote photo has none
unless something computes one, and a single shared blur would be a fabricated
preview of content it has never seen — every photograph unblurring into
something that looked nothing like its own preview. A flat brand ground is
honest and costs nothing.

**The real version is possible and is not built here.** `normalisePhoto`
already re-encodes uploads with sharp, so it could emit a 20-byte base64 LQIP
alongside. That needs a field on the content types and a migration of the
stored payloads, which is its own change.

## The date was wrong in an email somebody paid for

Two places carried the string **"21–22 November 2026"**, hand-typed from the
Bevy listing's "Nov 21–28": the hero's ticket stub, and the ticket
confirmation email.

A dash means "through". These are two Saturdays a week apart, so "21–22" is
wrong twice over — the wrong second date, and a claim of consecutive days. The
email version is read by somebody who has paid and is planning a Saturday
around it.

`formatEventDates(locale)` derives it from `EVENT_DATES`: **"21 & 28 November
2026"**, "21 et 28 novembre 2026". The ampersand is the point — it says two
days, both listed, where a dash says a range. The month is named once when the
days share one and twice when they do not, and an empty `EVENT_DATES` returns
null rather than a stray year.

The `home.hero.dates` copy key is **gone**. A date is a fact about the event,
not a phrase to translate. The tagline changed with it: it said "One day" for
a two-day event.

## Mobile stacking

- **The ticket stub folds.** It was one `nowrap` row holding a full date and a
  city; at 360px both halves ran past the pill's rounded ends, putting the
  perforation and the venue outside the border. It is a column below `sm` now,
  with the perforation turning from a vertical rule into a horizontal one —
  and `rounded-lg` rather than `rounded-pill`, because a pill around two
  stacked lines is a lozenge.
- **The scroll cue is hidden below `sm`.** It is absolutely positioned so it
  costs no row, but on a 360×640 screen the content column already fills the
  viewport and the cue landed on top of the buttons. Nobody needs telling that
  a phone scrolls.
- **`min-w-0` on the content column.** Without it a flex child will not shrink
  below its content's intrinsic width, which is how a long headline turns a
  hero into horizontal scroll.

## Consequences

- `Hero` takes `locale` as a prop. It needs it to format a date, and reaching
  for `useLocale` in a server component to avoid one prop is worse.
- `MorphedImageFrame` — every team, speaker and memory-lane photo — goes
  through `ContentImage`, so the optimisation lands on the surfaces that will
  actually hold photographs. It gained a `sizes` prop with a responsive-grid
  default; pass a real one anywhere that assumption is wrong, because an
  over-generous `sizes` is a full-width download for a thumbnail.
- **`npm run build` passes**, which it had not been able to do in this
  environment before (no network for the Google Fonts fetch). Two font
  override warnings remain and are pre-existing.
