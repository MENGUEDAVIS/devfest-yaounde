# 0008 — Retire the Bevy RSVP path; tickets are the way in

Date: 2026-08-29
Status: Accepted

## Context

`PAGES.md` was written on the premise that the GDG Bevy chapter page is "the RSVP source of truth", with RSVP-on-Bevy offered as a tertiary call to action in the hero, in the footer link groups, and as the framing of the footer's closing CTA. That premise no longer holds: the route into the event is the ticket flow.

This record exists because the change **reverses an earlier documented premise** rather than merely adjusting copy.

## Decision

The **RSVP-via-Bevy action is removed everywhere it appeared as a way to attend**:

- Hero: the "or just RSVP on Bevy" tertiary link is gone. Primary path is **Get Tickets**, secondary is Shop.
- Footer link groups: the standalone "RSVP" item under _Get Involved_ is gone.
- Footer closing CTA: was framed as an RSVP ("Be part of the story — RSVP now") and pointed at Bevy; it now reads as an invitation and points at `/tickets`.
- The `footer.getInvolved.rsvp` and `home.hero.ctaTertiary` message keys were deleted from both locales.

**"Join the Community" is deliberately KEPT** (`footer.getInvolved.community`, still pointing at `BEVY_URL`, plus the pre-footer Community CTA section). Joining the chapter community is a distinct, year-round action from RSVPing to this specific event, and `PAGES.md` §2.9 treats it as its own thing. This was explicitly surfaced for a decision rather than removed silently or kept silently — see the phase summary.

## Consequences

- Bevy's role narrows from "RSVP source of truth" to "community home". `PAGES.md` §0 and §1.3 have been annotated accordingly rather than rewritten, so the original intent stays legible.
- One less path into the event means the ticket flow is now load-bearing: whatever `docs/decisions/0003-payments-and-auth.md` eventually settles on has to cover the free tier too, since there's no longer a no-ticket way to say you're coming.
- If the community link is later dropped as well, `BEVY_URL` in `src/lib/site-config.ts` becomes unused and the placeholder can be deleted outright.
