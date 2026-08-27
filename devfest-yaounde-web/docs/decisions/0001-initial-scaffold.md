# 0001 — Archive Legacy Work, Start Fresh in `devfest-yaounde-web/`

Date: 2026-08-27
Status: Accepted

## Context

The repo (`Joel-Fah/devfest-yaounde`) already contained a partial implementation: a static, dependency-free site (`index.html`, `assets/`, `faqs/`, `schedule/`, `speakers/`, `team/`, `tools/`, plain Node scripts for serving/verifying, no framework). This was an earlier attempt that predates `DESIGN.md` and `PAGES.md` as the sources of truth, and the project owner explicitly asked for a clean start rather than a continuation or migration.

## Decision

- Moved every pre-existing top-level file and folder into a new `legacy/` directory at the repo root, unchanged, using `git mv` to preserve history. Nothing was deleted.
- Created a new top-level folder, `devfest-yaounde-web/`, which is now the actual project root going forward. All future branching, docs, skills, and application code live inside this folder so it remains a fully self-contained, portable unit — the reusable template for future years.
- The repo root now holds two siblings: `legacy/` (frozen archive, not referenced for implementation ideas) and `devfest-yaounde-web/` (active project).

## Consequences

- Makes it easy to reference old markup/copy later purely for historical/content-recovery purposes, without it influencing new architecture or design decisions.
- Means the repo root is no longer itself a working site — anyone cloning the repo needs to `cd devfest-yaounde-web` to find the live project. This should be called out clearly in the top-level README (or a root-level pointer) once one exists.
- Nothing from `legacy/` was cherry-picked into the new build. If content (copy, imagery, data) is ever pulled from `legacy/`, that should be a deliberate, separately-documented decision — not silent reuse.
