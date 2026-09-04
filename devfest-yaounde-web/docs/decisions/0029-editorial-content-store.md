# 0029 — Editorial content is not editable from the dashboard, and why

Date: 2026-09-03
Status: **Accepted by 0031** — Postgres is the writable store; JSON files remain the seed/fallback.

## Context

The admin dashboard was asked to offer CRUD over speakers, team, sessions,
sponsors and partners, CSV bulk upload for several of them, an editable
announcement message, and editable privacy / code-of-conduct URLs.

Inspecting the backend first (`docs/backend/ADMIN-CAPABILITIES.md`) turned up
the thing that decides all of it: **the site's data lives in two different
places, and only one of them can be written.**

| Kind                                                                            | Where                                | Writable by a running site? |
| ------------------------------------------------------------------------------- | ------------------------------------ | --------------------------- |
| Tickets, orders, payments, discount codes, profiles, DP cards                   | Postgres                             | **Yes**                     |
| Speakers, sessions, team, sponsors, FAQs, quotes, stats, products, ticket tiers | `src/data/*.json` in the repo        | **No**                      |
| The announcement message                                                        | `messages/{fr,en}.json` in the repo  | **No**                      |
| Privacy / CoC URLs                                                              | `src/lib/site-config.ts` in the repo | **No**                      |

A deployed Next.js app cannot write to its own source. On Vercel the
filesystem is read-only; on a plain server the next deploy would overwrite it
and other instances would never see it. This is not a missing endpoint — it is
the wrong kind of storage for the job.

## The decision that has to be made

**Move editorial content into a writable store, or keep editing it in the
repo.** Both are defensible, and the trade is not technical:

**Keep it in the repo.** Editing is a pull request: reviewed, diffed,
reversible, and impossible to get wrong at 2am without someone seeing. Costs
a developer for every typo, and the content freeze becomes a deploy freeze.

**Move it to Postgres or a CMS.** Organisers edit their own content. Costs a
schema per entity, an authz story per entity, validation that used to be
TypeScript types, an editing UI per entity, and it loses code review on
public-facing copy. It is roughly the size of the commerce backend that
already exists.

A middle option worth naming: move only what changes during the event —
the announcement message and a handful of URLs — into a small `settings`
table, and leave speakers, sessions and products in the repo where a
reviewed diff is genuinely the right process for them.

**This phase takes none of those.** It is an architecture decision with an
ongoing cost, and inventing it inside a UI task is exactly how a project ends
up with half a CMS.

## What the dashboard does in the meantime

Every editorial entity is **read-only** and says so on screen, naming this
record. There is no save button that would discard what you typed — a control
that silently drops your work is worse than no control, which is the same rule
that removed the fake fulfilment picker (G13).

CSV **import** is built as far as it can honestly go: the file is parsed,
validated against the real schema, guarded against formula injection, and
shown as a dry-run preview with per-row errors. It stops before committing,
because there is nowhere to commit to. That work is not wasted — it is the
same validation any future importer needs, and today it tells an organiser
whether the sheet they are about to hand a developer is actually correct.

CSV **export** is real, because reading is not the problem.

## Consequences

- Whoever takes this decision should take it before the content freeze, not
  during it.
- If the answer is "move it", the dashboard's read-only views are already the
  shape of the editing UI — the tables, the columns and the validation exist.
- If the answer is "keep it in the repo", the honest follow-up is to make the
  repo path pleasant: `docs/guides/updating-content.md` is already that guide.
