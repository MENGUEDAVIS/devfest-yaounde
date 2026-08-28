# 0005 — Yellow Base Theme (retires the per-section color mapping)

Date: 2026-08-28
Status: Accepted

## Context

`DESIGN.md` originally assigned each page its own core color (Event = Blue, Tickets = Yellow, Swag/Shop = Green, Community = all four). That mapping was implemented faithfully in Phases 1–3, and the result was the problem: every section introduced a new color, so the site read as a rainbow rather than as one brand. Scrolling the Home page meant passing through blue, then yellow, then green, then a dark band, with no through-line.

The reference point the project owner raised is DevFest Lagos, which leads with a single warm yellow — the background wash, the scrollbar, even the cursor pick it up — and uses the other brand colors only for small semantic moments. That reads calm and cohesive.

Two related problems were fixed at the same time, since they compound the same "incoherent surface" symptom:

- **Gradients had crept in** (the footer CTA band used a three-stop blue→green→yellow gradient). Gradients were never in the brief.
- The palette's off-white was being treated as the page ground, which left nothing carrying the brand between accent sections.

## Decision

Adopt a **yellow-dominant base theme**, and retire the per-section color mapping.

- **Dominant (~70% of colored surface):** Pastel Yellow `#FFE7A5` is the default page and section wash — it replaces Off White as the page ground. Yellow 600 `#F9AB00` carries primary emphasis (key CTAs, active states). Halftone Yellow `#FFD427` handles accents and hover.
- **Supporting (~30%):** Blue, Green, Red are demoted to semantic jobs only — Blue for links/occasional secondary CTA, Green for success/"in stock", Red for urgency/sold-out/errors. A section should almost never show all four at once.
- **Neutrals:** Off White is now a secondary background (used for section rhythm contrast); Black 02 unchanged.
- **Gradients are banned outright.** Every colored surface is a flat solid fill. Where depth was wanted, flat shapes layer over flat shapes and flat offset shadows replace soft blurs.
- **Themed chrome** implemented globally in `globals.css`: yellow-family scrollbar (both WebKit and Firefox syntax), `::selection`, and focus ring.

Section rhythm is now expressed through `SectionContainer`'s `background` prop (`yellow-wash` | `offwhite` | `yellow` | `black02`) rather than hand-coded per-section colors, so the rhythm is a constrained choice instead of a free one.

## Consequences

- **`DESIGN.md` §2.5 now overrides §2.7 (the old mapping), which is kept only as a signpost** so a future contributor doesn't "restore" it thinking it was lost. Reintroducing per-page colors is a regression, not a refresh.
- Any future page (Speakers, Schedule, Tickets, Shop) inherits the yellow base automatically by using `SectionContainer`. Tickets no longer gets yellow because it's "the tickets page" — it gets yellow because everything does; its distinctiveness has to come from layout and content instead.
- The `devfest-design-system` skill was updated so the base-theme rule and the gradient ban are enforced on future work without re-reading `DESIGN.md`.
- Placeholder image assets (`public/placeholders/*.svg`) were re-tinted from their original blue/green/yellow/red set into the yellow family. These stand in for real photos; once real community photos land they will naturally be full-color, and that is fine — photographs aren't brand color surfaces. The re-tint exists so the _current_ placeholder state honestly reflects the theme instead of contradicting it.
- Contrast was preserved by keeping Black 02 as the text color on every yellow surface (Yellow 600 and the pastels both fail 4.5:1 against white).
