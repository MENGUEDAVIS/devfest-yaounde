---
name: devfest-docs-workflow
description: Use after completing any non-trivial implementation task or making an architectural choice on the DevFest Yaoundé site. Reminds you to write/update a decision record or feature guide under docs/, with the template inlined so nothing needs to be looked up.
---

# DevFest Yaoundé Docs Workflow

This project treats `docs/` as a first-class deliverable, not busywork — it's what lets future organizers (and future Claude Code sessions) pick this template up year after year without re-deriving context. Documentation happens **as you go**, not retroactively at the end of a session.

## When to write something

- **Made an architectural or structural choice** (new dependency, new data shape, new routing pattern, a tradeoff between two approaches)? → write a decision record.
- **Finished a non-trivial feature** that a future non-technical organizer will need to operate or update (e.g. adding a speaker, changing ticket prices, swapping a sponsor logo)? → write or update a feature guide.
- Skipping this step because "it's a small change" is only correct if the change is genuinely trivial (typo fix, formatting). When in doubt, write the doc.

## Decision records — `docs/decisions/NNNN-short-title.md`

Numbered sequentially, never reused. Template:

```markdown
# NNNN — Short Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by NNNN

## Context
What situation led to this decision needing to be made?

## Decision
What was decided.

## Consequences
What this makes easier, harder, or what it locks in.
```

Check `docs/decisions/` for the highest existing number before creating a new one.

## Feature guides — `docs/guides/feature-name.md`

Written for the **next organizer**, not a developer: plain language, description of the actual UI (screenshots if available), and a direct answer to "how do I update this next year." Examples: `docs/guides/updating-ticket-tiers.md`, `docs/guides/adding-a-speaker.md`.

No fixed template beyond that — prioritize clarity for a non-technical reader over structure for structure's sake.

## Where these live

Both live inside `devfest-yaounde-web/docs/` (not the repo root) — this keeps the project folder fully self-contained and portable across years:

```
devfest-yaounde-web/docs/
  decisions/   # ADR-style, numbered
  design/      # copy of DESIGN.md
  content/     # copy of PAGES.md
  guides/      # per-feature, organizer-facing
  setup/       # env vars, local dev, deployment instructions
```
