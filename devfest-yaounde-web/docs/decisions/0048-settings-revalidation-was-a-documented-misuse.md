# 0048 — The settings revalidation was a documented API misuse, and a second field silently went missing with it

Date: 2026-09-10
Status: Accepted — corrects ADR 0042

## The report

A hero image uploaded through the dashboard "successfully" — 200 response,
audit row written — and never appeared on the public home page.

## The actual bug: `revalidatePath` called the way its own docs say not to

`revalidateSettings()` (ADR 0042) called:

```ts
for (const locale of routing.locales) {
  revalidatePath(`/${locale}`, "layout");
}
```

`/fr` and `/en` here are LITERAL, already-resolved paths. `next/dist/docs`
for this exact Next version (`revalidatePath.md`) states the rule directly:

> `type`: … If `path` contains a dynamic segment, for example
> `/product/[slug]`, this parameter is required. **If `path` is a literal
> path like `/product/1`, omit `type`.**

`type: "layout"` exists to say "match this ROUTE PATTERN's file" —
`/product/[slug]` — so Next knows which layout file on disk to invalidate,
and cascades to everything beneath it. `/fr` is not that pattern; the file on
disk is `[locale]/layout.tsx`. Passing a resolved literal path alongside
`type: "layout"` is, by the framework's own reference, a misuse — the call
was not doing "every page rebuilds," which is what ADR 0042 believed it
shipped and what the settings write genuinely needed.

That is the entire explanation for the report: the database write was
correct, `loadSettings()` would have read it back correctly on a fresh
render, and the running server simply never produced one — it kept serving
the prerendered HTML from before the upload, indefinitely, because nothing
had told it to stop.

**The fix is the docs' own worked example**, titled "Revalidating all data":

```ts
revalidatePath("/", "layout");
```

One call, on the app root. `type: "layout"` here is legitimate — `/` is a
route segment, not a resolved literal like `/fr` — and it cascades through
every nested layout beneath it, `[locale]/layout.tsx` included, to every page
under both locales. This replaces the per-locale loop entirely; `routing`
stays imported only for `revalidateCollection`'s per-collection paths, which
were already using literal paths with no `type` argument and needed no
change.

**Why this was not caught earlier**: every prior "photo not showing" fix
(ADR 0042 itself) went through `revalidateCollection`, which never had this
shape — plain `revalidatePath(fullLiteralPath)`, no `type` argument, which is
exactly the form the docs call correct for a literal path. The layout-typed
call was new to `revalidateSettings` and untested against a live deployment
until this report, which is the standing limitation flagged on every settings
ADR in this project: nothing here has run against real Supabase and a real
Next server until an organiser does it.

## The bug found alongside it: `saveSettings` silently blanked the announcement

While tracing the write path, a second, unrelated bug turned up in the same
function. Every field but two used the established rule, stated in the code's
own comment: _"only written when the caller sent them."_ `announcement` and
`bevy_url` did not follow it — they were written unconditionally on every
call:

```ts
announcement: parsed.data.announcement ? toJson(parsed.data.announcement) : null,
bevy_url: parsed.data.bevyUrl || null,
```

The hero-image route calls `saveSettings({ hero: {...} }, actor)` — no
`announcement`, no `bevyUrl` in the payload. `parsed.data.announcement` is
then `undefined`, which the ternary above treats as "write `null`." **Every
single hero image upload was silently deleting whatever announcement text was
live**, and resetting the Bevy URL to the repo default. Both are now spread
conditionally, matching `hero`/`cfs`/`sponsorCall`/`legal`, which already did
this correctly.

This did not cause the reported symptom — it is a second, independent defect
the same investigation surfaced, not a chain reaction from the first. Flagged
because a silent data loss on an unrelated field is worse than the bug that
was actually reported.

## Consequences

- `revalidateSettings()` is now one call instead of a loop; `revalidateCollection`
  is unchanged.
- **Not verified against a live deployment.** Both fixes are grounded in the
  framework's own documentation and a direct read of the code's inconsistency
  with its own stated rule, not in watching a real upload land. The organiser
  who reported this is the first person who can confirm it end to end.
- If a future settings field is added to the write path, the pattern to copy
  is the conditional spread — `announcement` and `bevy_url` are no longer the
  exception that makes copying the nearest example wrong.
