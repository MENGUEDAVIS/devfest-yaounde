# 0035 — Chart.js on the admin overview

Date: 2026-09-04
Status: Accepted

## Context

Phase 18 asked for animated charts on the organiser dashboard: countdown to
D-Day, tickets over time, revenue, shop orders, DP submissions. The human
named **Chart.js** specifically. The stack ADR (`0002`) has no chart library.

## Decision

**`chart.js` (v4) is the only new dependency.** Used on the admin overview,
client-side, dynamically imported so a dashboard that never opens Overview
does not pay for it on first paint.

No `react-chartjs-2`. A canvas ref and `new Chart()` is enough, and it keeps
the dependency count at one.

Animation runs on load, and is **off** under `prefers-reduced-motion`. Colours
come from the theme tokens (`--color-primary`, `--color-black02`). No
gradients as fills — flat.

While `EVENT_BASE_DATE` is null the countdown is labelled as unconfirmed,
not invented. Series that have no rows yet render as empty axes with a
caption, not fake data.

## Consequences

- A new runtime dependency, organiser-only. Public pages do not import it.
- Chart.js is canvas, not SVG: fine for a dashboard, not for a marketing
  page, which this is not.
