# 0010 — Group the team by contribution, not a sub-team org chart

Date: 2026-08-29
Status: Accepted

## Context

`PAGES.md` §6 allows grouping the team page by sub-team (Design, Logistics, DevRel, Community…) **if the org chart supports it**. It never did: the real structure has never been confirmed, so Phase 8 shipped one flat grid plus a visible note admitting the structure was unknown.

That note was honest, but it's a placeholder apologising for missing information rather than a design.

## Decision

Group and filter the team by a new **`contribution`** field on each member — what they actually do for the event (Organising, Design, Logistics, Sponsoring, Ushering, Programme).

- It's a real, knowable property of each person, unlike a reporting structure.
- It doesn't imply a hierarchy that may not exist.
- It doubles as the filter axis on `/team`, so one field earns its place twice.
- New contributions appear automatically — adding a member with a contribution nobody else has creates that group and filter chip without a code change.

The "structure unknown" note is **retired**, and the `pages.team.structureNote` message key deleted from both locales, because the page no longer implies a structure it doesn't have.

## Consequences

- If a real sub-team org chart is confirmed later, this doesn't block it — grouping is driven by one field, so switching axis is a small change in `TeamBrowser`.
- Contribution values are free text per member (localized), so a typo creates a stray one-person group. `docs/guides/updating-content.md` tells organizers to reuse an existing value exactly.
- Alumni deliberately sit outside the filtered set in their own section, so narrowing the filters never hides the past-organiser story.
