# 0040 — The participation terms are the conduct document, and the seats stay visible

Date: 2026-09-08
Status: Accepted — supersedes the `CODE_OF_CONDUCT_URL` placeholder in 0038

## The code of conduct: confirmed, and it is the participation terms

ADR 0038 left `CODE_OF_CONDUCT_URL` as `"#"` rather than guess, because
"probably covers conduct" is not good enough for the link offered to somebody
asking what happens if they are harassed.

**The organisers confirmed it on 2026-09-08: the chapter runs under GDG's
participation terms, which is what its own Bevy page links.** There is no
separate document, and pretending otherwise would send people looking for a
page that does not exist.

So the concept is gone, not repointed:

- `CODE_OF_CONDUCT_URL` is deleted from `site-config.ts`.
- The footer lists **Participation Terms · Privacy Policy · Terms of Service**.
  Three links where there were two — the terms of service had nowhere to live
  before.
- The FAQ answer that promised "a code of conduct" now names the participation
  terms, and its button links them.
- The dashboard has no code-of-conduct box. An empty field invites somebody to
  fill it, and there is nothing to fill it with.

**The FAQ category id stays `code-of-conduct`.** It groups questions about
behaviour at the event, which is what they are; renaming it would mean
rewriting stored payloads that already use that string, for a value nobody
sees. The label and destination changed, which is what visitors read.

## One home for the legal links

`site_settings` held the same facts twice: `privacy_url` and `coc_url` from
migration 0011, and `legal` from 0016 holding all three URLs. Two writable
homes for one link is the shape of a bug nobody notices until the footer and
the dashboard disagree about the privacy policy.

`legal` wins. Migration 0017 **backfills first, in the same statement order** —
anything typed into the old columns moves into `legal` rather than going over
the side with them — and `coc_url` lands on `participationTermsUrl`, because
anyone who had set it was pointing at conduct rules.

`AdminSettings` loses its flat `privacyUrl` / `cocUrl` fields for the same
reason: the type should not offer two ways to say one thing.

## The sponsor strip shows the empty seats

It used to hide itself when nobody had signed, which was the right fix for the
wrong problem. An empty marquee — a labelled, bordered strip with a blank
track — reads as broken, so hiding it was better than showing it. But a strip
that is _absent_ tells a company reading the site nothing, and this is the one
surface where "there is room for you here" is worth saying out loud.

**Six seats**, filled from the left. Three reads as a mistake; ten makes each
seat too small to hold a logo legibly. Whatever is left over stays visibly,
deliberately open — three logos beside three dashed outlines is a more honest
and more persuasive picture than three logos alone.

Only the **first** open seat is captioned "Your logo here". Six boxes each
repeating it is a nag; one labelled seat in a row of waiting ones is an
invitation. Seats past the third are hidden below `sm`, where they would
otherwise wrap onto a second and third line.

### The marquee is conditional now

It scrolls only once every seat is filled. While one is open the row fits, so
there is nothing to scroll past — and animating a line of dashed placeholders
would read as a loading skeleton, which is the one thing it must not look
like.

### Accessibility

The seats are `aria-hidden`. A screen reader working through six unlabelled
boxes learns nothing; a single `sr-only` sentence — "4 sponsor seats still
open" — is the fact they encode. The duplicated half of the marquee is
`aria-hidden` and `tabIndex={-1}` for the same reason it always was: it is the
same companies twice, and it should be neither read out twice nor tabbed
through twice.

## "Become a sponsor" is an ask with an off switch

`sponsor_call` was seeded in 0016 and had no UI. It does now: prospectus URL,
a close date in Yaoundé wall-clock, and an on/off switch.

**The switch is checked before the date, and both must agree.** Turning it off
is how an organiser takes the ask down early — mid-negotiation, or when the
deck is out of date — and a deadline that has not arrived must not quietly
override that. An empty prospectus URL also hides it, because there would be
nothing behind the button.

An **unparseable** close date leaves the ask up. That is a typo, and hiding
the CTA because of one would be a silent failure nobody would think to look
for.

The CTA sits in the strip's label row, pinned outside the track — same
reasoning as the call-for-speakers button in the banner (ADR 0039): a button
that scrolls past is a button you have to chase.

## `external` now means what it says

`Button external` and `faq.cta.external` rendered a plain `<a>` instead of a
`Link` — correct, since next/link should not prefetch a URL it does not own —
but stayed in the same tab. Sponsor logos, the prospectus, the legal pages and
"Join the community" all leave the site, and losing the page somebody was
reading is a worse trade than an extra tab. `external` now adds
`target="_blank" rel="noopener noreferrer"` everywhere, so the word means one
thing.

## Consequences

- **Sponsor logos are links and are bigger** (`h-11`/`sm:h-14`, was
  `h-9`/`sm:h-11`). A logo on a page that does not go to the sponsor's site is
  a thank-you card with the address torn off.
- The strip is its own component. It needs the store and the settings, and the
  hero should not be the thing that fetches them — which also makes the hero
  redesign in Part 5 a smaller change.
- Eight tests cover the seats and the call window. Neither needs a database.
- **Migration 0017 drops two columns.** The backfill preserves their values
  into `legal` first, but it is still a drop: apply it to a database whose
  `legal` column you have looked at.
