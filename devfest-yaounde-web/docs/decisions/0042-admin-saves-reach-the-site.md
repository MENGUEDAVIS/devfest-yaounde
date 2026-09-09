# 0042 — Four ways the dashboard was broken, and one selector that caused two

Date: 2026-09-09
Status: Accepted

Reported by the organisers after using the dashboard for real. Every one of
these is a defect, not a refinement, and two of them share a root cause.

## The Save button did not exist

`globals.css` suppressed the site chrome inside the admin like this:

```css
body:has([data-admin]) header,
body:has([data-admin]) footer {
  display: none;
}
```

Those are **element** selectors. They matched every `<header>` and `<footer>`
anywhere inside the dashboard, not just the site's. What they actually hid:

- `PageHeader` — so **no admin page had a title**;
- every `Panel`'s header — so panels lost their heading _and_ the action
  button that sits in it;
- the edit drawer's header (title and Close) and its **footer, which is where
  Save lives**.

So a record could be opened and edited and not saved. A dashboard where
nothing can be saved is a dashboard that does not work, and the cause was a
selector one word too broad.

**Fix: the site chrome says which elements it is.** `GlobalChrome` carries
`data-site-chrome`, `Footer` carries `data-site-footer`, and the rule targets
those. Nothing about the admin's own markup can collide with it again.

This is the second time on this project that a tag-name selector has reached
further than intended. The lesson is small and worth writing down: **suppress
a specific component, never a category of element.**

## Every page's title was missing — and four had two

Same selector, so the same fix restores it. But it exposed a duplicate
underneath: `AdminShell` renders a `PageHeader` for every view _and_ the four
CRM views each rendered their own. With the CSS bug fixed, Speakers, Team,
Schedule and Sponsors would have shown their heading twice.

The shell's is the one guaranteed to exist for every view, so it wins. The
richer blurbs the four views were carrying moved into the shell's `HEADERS`
table rather than being thrown away, and the `config` blurb — which still
promised a "code of conduct" — was corrected to match ADR 0040.

## The chart animated to an empty room

`AdminChart` had `animation: { duration: 900 }` and it worked. Nobody ever saw
it: the chart sits well below the stat tiles on Overview, so it was
constructed at page load, drew its entrance while off screen, and was already
finished by the time anybody scrolled down.

Exactly the mistake the hero made behind the preloader (ADR 0041), in a
different component, found the same way — by someone watching the real thing.

**Fix: do not construct the chart until it is in view.** An
`IntersectionObserver` gates the build, and Chart.js animates from
construction — so "when it is built" and "when the animation plays" become the
same moment. No second animation system, nothing to keep in sync.

One-way: once seen it stays built. Replaying the entrance on every scroll-past
would be a fidget, not an entrance. Without `IntersectionObserver` it draws
anyway — a chart that is there beats an entrance.

## An uploaded photo never reached the site

The most serious of the four, because everything about it looked like it
worked. The organiser uploads a photo; the API stores the bytes, updates the
record, writes the audit row and returns 200; the admin list shows the new
picture. The public team page shows nothing.

**Every public page is statically prerendered** (`●` in the build output).
`/fr/team` is HTML generated at build time, and nothing had told Next it was
stale. The photo was in the database and the page had no reason to be built
again.

That defeats the entire premise of the content store (ADR 0031) — _edit the
site without a deploy_. Without this, every edit needed a deploy. It applies
to every collection, not just team photos: a new speaker, a session, a
sponsor, a corrected FAQ. All of them saved. None of them appeared.

**Fix: `revalidatePath` from the three write paths** — the collection PUT, the
photo POST, and the settings PUT — through `src/lib/content/revalidate.ts`.

### Why on-demand and not a time window

`export const revalidate = 60` would also have worked, eventually. But a time
window means an organiser saves, reloads, sees nothing, and **cannot tell a
slow cache from a failed save** — so they save again, and again, and file a
bug. Invalidating the exact paths a change touched makes the reload after a
save always correct, and costs nothing on every other request: the pages stay
static and cheap.

### Why the path map is explicit

`PAGES` lists, per collection, where it is visible — `speakers` reaches `/`
and `/speakers`, `sponsors` only reaches `/`, and so on. It is
`Record<CollectionId, string[]>`, so **a new collection will not compile until
somebody says where it is shown**. A missing entry is a page that silently
never updates, which is precisely the bug being fixed here.

Blanket invalidation was the alternative and is worse: it throws away the
whole static build on every small edit, and nobody notices until the bill.

Settings are the exception and get their own function. The announcement banner
is in the **root layout**, so a settings change is every page — which is what
`revalidatePath(path, "layout")` is for.

## Consequences

- **Untested against a live project, again.** The revalidation, the upload and
  the save all need a Supabase project and an organiser row. What is verified
  is that it compiles, lints, passes 162 tests and builds — and that the pages
  it invalidates are the ones the build output says are prerendered.
- The team page is still `●` in the build output, and should be. Static plus
  on-demand invalidation is the goal, not dynamic rendering.
- If a future page reads a collection, **add it to `PAGES`**. The type will
  not catch a new _page_, only a new collection.
