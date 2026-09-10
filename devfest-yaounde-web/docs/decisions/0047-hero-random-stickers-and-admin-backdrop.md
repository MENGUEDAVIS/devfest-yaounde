# 0047 — A scatter that re-rolls, a year you never edit, and a backdrop from the dashboard

Date: 2026-09-10
Status: Accepted — extends ADR 0046

Six changes to the v3 hero, one console bug, and two bugs the screenshots
caught that nobody reported.

## The bug that was reported: duplicate React keys

The hand-authored cluster carried desktop and mobile variants of the same
sticker — two `burst`, two `spark`, two `pin` — and keyed on `sticker.id`.
React reported three duplicate-key errors and silently dropped one of each
pair.

Keying on something that _can_ collide is the root cause, so the key is now
the placement's own id (`burst-3`), generated with the scatter and unique by
construction. The sheet is also sampled **without replacement**, so a
duplicate cannot arise in the first place. Both, because either alone would
have been enough and neither alone would have been obvious to the next person.

## Random stickers, bounded by zones

Every load now draws a fresh scatter: which stickers, where, how big, which
way up, how far away.

**Randomness across the whole hero would eventually put a coffee cup on "Grab
your ticket"** — and on a page that re-rolls every load, "eventually" is some
visitor's first impression. So the randomness is bounded by ZONES: rectangles,
in percentages, known to be free of copy at that breakpoint. A sticker picks a
zone, then a point inside it. Everything else is free.

**A zone bounds the sticker's TOP-LEFT CORNER**, and the sticker extends right
and down from it by its own size. That is easy to forget and it showed
immediately: a zone whose right edge merely _touched_ the tagline still put a
pin on top of the words. Every zone is now pre-shrunk by roughly one large
sticker, and the comments name the content each keeps clear of.

The two breakpoints get their own maps rather than one scaled map. Mobile has
almost no free space — measured at 390×844, the band above the tagline is 7%
tall and a sticker is 10% — so the phone gets three zones and three stickers.
The density that reads as playful on a desktop reads as clutter on a phone.

### Generated on the client, deliberately

`Math.random()` during render is a hydration mismatch: the server picks one
scatter, the browser picks another, React finds two trees. Generating in an
effect after mount means the server renders nothing there and the browser
fills it in — right for a decorative, `aria-hidden` layer.

It also keeps the page's HTML identical for every visitor, so the static
prerender stays valid. Generating on the server would have baked ONE scatter
at build time and served it to everybody forever, which is the opposite of the
intent.

### One scatter, two layers — a bug the screenshots caught

`HeroStickers` was mounted twice, once per layer, each running its own effect
and so generating its **own independent scatter**, then discarding the half
that did not match its layer. Two draws from the sheet meant the same sticker
could be picked by both: the front and back layers each rendered a bracket
mark, side by side. Sampling without replacement cannot help across two
separate draws.

One mount, one draw, two positioned wrappers it renders itself. DOM order does
not matter — `z-index` decides what paints over the wordmark.

### Depth is two things that must agree

A near sticker is big, sharp, and leans a long way with the pointer; a far one
is small, soft, and barely moves. Picking those independently is what makes
fake depth of field read as an effect rather than as distance, so a weighted
tier decides all four together. A test asserts they cannot drift apart.

## The year, as a sticker

A bordered pill, angled, sitting on the second line of the wordmark. It is
**not** in the random scatter: it carries information, and information does
not move every load.

`EVENT.year`, so next year's edition is already correct with no edit.

**Its offsets are percentages, not `em`** — and that was a real trap. The pill
sets its own `font-size` in `em` of the wordmark, which is correct; but `left`
and `bottom` in `em` then resolve against **the pill's own font-size**, not the
parent's. The first attempt put it at 1.02em intending one wordmark-em and got
34px, parking it off the left edge of the letters.

## Date and venue: bottom-right, on one line

They were a vertical pair under the CTAs, which read as two more items in a
column that already had three. Side by side along the bottom edge they read as
a caption to the whole hero — which is what a date and a place are — and they
balance the wordmark's mass on the opposite corner. A hairline between them
makes them one caption rather than two adjacent blocks.

## The backdrop comes from the dashboard

It used to be `pastEditions[0]`, which meant **reordering the Memory Lane
gallery silently changed the front page's background**. Two unrelated screens
coupled by an array index.

`site_settings.hero` (migration 0018) holds it, uploaded from Configuration.

### One upload, not two

`next/image` generates a responsive `srcset` from the single file, so a phone
downloads a phone-sized image — the "optimised for mobile and desktop" part
needs no second asset. A separate mobile crop is only worth its upkeep for
**art direction** — a different composition, not a different size — and this
image sits under a heavy tint and a dot field, where it reads as texture
rather than as a subject that has to stay framed. If that changes, the place
to add `hero.mobileImageUrl` is stated in the schema.

### WebP, because JPEG would destroy the point

`normalisePhoto` encodes JPEG, which has no alpha channel: every transparent
pixel comes out a flat colour the encoder chose. For a speaker's portrait that
is fine and smaller. For this it destroys the thing the backdrop is for — a
cut-out subject is supposed to let the themed ground show through, and JPEG
would replace that ground with a hard rectangle of black or white. The same
class of bug ADR 0037 fixed on the community wall.

`normaliseBackdrop` encodes WebP with `alphaQuality: 100`, at 2400px rather
than 1600 — generous for a card is thin for something full-bleed.

### The themed ground is always painted

Not a fallback for a missing image: it is what shows **through** one with
transparency, which is why it stays when an image is present. With no image
there is also no scrim — a tint over the bare theme colour would just make the
hero a muddier yellow, and "no photograph" is a finished look rather than a
gap waiting to be filled.

## Leaving the scene

`--exit` already ran 0 → 1 as the hero scrolled away; now everything rides it.
The left mass lifts, shrinks and fades; the right column moves the **other**
way, down and out, so the two halves part rather than sliding in convoy.

This includes the wordmark, which ADR 0046 deliberately excluded on the
reading that "only the reveal animation applies" to it. A scene where
everything recedes except the biggest thing in it reads as the biggest thing
being stuck. The recede lives on a wrapper, not on the wordmark itself, so the
per-character `clip-path` and the transform never contend for one property.

Measured at 450px of scroll: left `translateY(-32px) scale(0.967)` at opacity
0.40, right `translateY(+17px)` at 0.37.

## Consequences

- The label beside the mark is `body-m`/`body-l` rather than a mono tag. It
  was a footnote under a wordmark ten times its size.
- **`storePhoto` takes a content type.** It hardcoded `image/jpeg`, which
  would have served the WebP backdrop with the wrong header.
- Five tests cover the scatter over 200 rolls each — a property that holds
  once may just have been a lucky seed. They assert no duplicate ids, unique
  keys, every placement inside a declared zone, depth and blur in step, and
  the mobile thinning.
- Verified: lint, typecheck, 175 tests, build; screenshotted at 390/1440 in
  both locales, reduced-motion, and mid-scroll; console clean; five reloads
  produced five distinct scatters.
- **Not verified: the upload path itself.** `POST /api/admin/hero-image` needs
  a Supabase project and an organiser row, same standing gap as every other
  admin write. Migration 0018 has not been applied to a live database.
