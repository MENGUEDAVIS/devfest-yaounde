# 0009 — One speaker interaction: swipe-up card, not a modal

Date: 2026-08-29
Status: Accepted (default per PHASE8 §3 — open to veto)

## Context

`PAGES.md` §4.2 originally specced the full `/speakers` page around a **modal**: click a speaker card, a dialog opens with the full bio, deep-linkable via a query param.

Phase 7 then changed the Home speaker preview to a different interaction — clicking swipes a detail panel **up over the card's own image**, explicitly "not a modal". That left the two surfaces heading for two different patterns for the same content.

## Decision

**One interaction across both surfaces: the swipe-up card detail.** `/speakers` reuses the exact `SpeakerCard` component from the Home preview, laid out as a responsive grid rather than an auto-advancing slider.

The generic `Modal` shell built in Phase 3 stays in the codebase — it's still the right primitive for genuinely modal moments later (checkout confirmations, for instance). It is simply no longer used for speakers.

Everything §4.2 asked for is preserved:

- **Doesn't navigate away** — the panel opens in place.
- **Shareable URL** — opening a card writes `?spk=<id>` via `history.replaceState`, so the link is copyable with no navigation and no scroll jump; landing on such a URL opens that speaker.
- **Full bio, role, company, session links, socials** — all in the panel, with social links rendered only for the networks a speaker actually has.
- **Consistent card sizing regardless of bio length** — the bio lives in the panel, never on the card face.

## Consequences

- One component, one set of interaction bugs, one place to change the behaviour. The slider adds spotlight/auto-advance _around_ `SpeakerCard`; the grid just lays them out.
- The detail panel is constrained to the card's own area, so it's a smaller reading surface than a modal would be. It scrolls internally when a bio overflows. If real bios turn out much longer than the placeholders, this is the thing to re-check — and the point at which a larger modal on the full page might genuinely be worth reconsidering.
- **This was the default choice, taken to avoid building two divergent patterns. It's reversible** — flipping `/speakers` back to the Phase 3 `Modal` shell would be a change to `SpeakerGrid` alone, since the data and deep-link handling are already separate from the presentation.
