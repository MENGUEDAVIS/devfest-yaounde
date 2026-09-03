# 0028 — What the community wall page shows, and what it does not

Date: 2026-09-03
Status: Accepted

## Context

PHASE17 specified the wall as a frontend-only build on placeholder data,
because "real community DPs need a submission/opt-in + storage + moderation
system that doesn't exist yet."

**That is no longer true.** Between the phase being written and being built,
the backend landed: `ADR 0026` (the wall's storage, endpoints and consent
record) and `ADR 0027` (publication without review by default). `GET
/api/dp/gallery` exists, returns approved cards only, and answers 404 when the
feature flag is off.

So the constraint the phase was protecting against — showing real faces with
no consent and no moderation — is already satisfied by machinery that exists.
What was left to decide is what this page does with it.

## Decision

**One component, one card shape, two sources.**

The page asks `GET /api/dp/gallery` when `NEXT_PUBLIC_DP_GALLERY` is on. If
the flag is off, the endpoint 404s, the request fails, or the wall is simply
empty, it renders `WALL_PLACEHOLDERS` instead — invented names over the
existing placeholder avatars — and **says so on screen**: _"Placeholder cards
— not real people."_

Both paths render through the same component and the same `{id, nickname,
imageUrl}` shape. There is no second layout to keep correct, and no way for
the placeholder path to drift from the real one.

**The wall is `noindex`, and absent from the sitemap.**

This is the decision worth arguing about, so here is the argument. The wall
shows photographs of people who agreed to appear _on a community page_.
Letting a search engine index and cache those faces is a further distribution
nobody agreed to, and it would outlive both the takedown path and the 200-day
retention rule: a card deleted on day 200 could still sit in an image index
long afterwards. **Consent to be on the wall is not consent to be in a search
result.**

The cost is real — the wall is exactly the kind of page that would attract
links — and it is accepted. If the chapter later wants it indexed, that is a
new decision, and the consent copy in the DP generator should say so _before_
anyone submits, not after.

## Consequences

- With the flag off, which is how it ships, the page is a working
  demonstration on obvious stand-ins. Nobody has to imagine it.
- The page is a single non-scrolling screen: the announcement bar moves to the
  bottom, cannot be dismissed there, and the site footer is not rendered — a
  footer below a wall that never scrolls is unreachable. All three are CSS
  rules keyed on `main[data-wall]`, so no shared layout was restructured for
  one route.
- Under `prefers-reduced-motion` the wall stops moving and becomes an ordinary
  scrollable list. "No motion" must not mean "no access", and the page's own
  scroll lock is lifted for exactly that case.
- **Not built:** infinite pagination. `GET /api/dp/gallery` is paginated and
  the wall reads page 0 only. With a real wall of a few hundred cards that is
  the right amount; past that, the loop should pull further pages as it goes.
- **Not built:** a report-this-card path. Retro-moderation exists as an
  organiser endpoint (ADR 0027), but a visitor who spots something wrong has
  no button. That is a gap worth closing before the flag goes on, and it is
  recorded in GAPS.md.
