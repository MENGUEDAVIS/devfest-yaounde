# Browser suites

Headless-Chrome checks for the things a unit test cannot see: motion, scroll
locks, hover behaviour, what a page returns to a stranger.

```bash
npm run build && npx next start -p 4399    # in one terminal
npm i --no-save puppeteer-core             # not a project dependency
npm run test:browser                       # in another
```

`BASE_URL` and `CHROME` override the defaults.

## Why these live in the repo now

They used to live in a scratch directory. When that directory was cleaned
between sessions, the runner kept reporting **"0 failures" for every one of
them** — a missing file writes its error to stderr, and the check counted
lines beginning with `FAIL`. Eighteen suites silently stopped running and
nothing said so.

A harness that passes when the tests are absent is worse than no harness: it
produces confident, false green. So:

- The suites are **committed**, and survive a clean.
- `run.mjs` holds an **explicit list**, and a missing file is a hard failure.
- A suite that exits non-zero fails the run.

Adding a name to `SUITES` in `run.mjs` is what makes it required.

## What each one covers

| Suite       | Covers                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preloader` | Server-rendered, full-viewport, the pinned line width, ink on any theme, the scramble running, gone inside 2s, the scroll lock taken and released, reduced motion                                                                         |
| `wall`      | Bottom bar, undismissable, no page scroll, column count and bleed, tilt, the mask fade, columns moving and alternating, hover stop + spotlight + dim, card sizes and ratios, placeholders labelled, noindex, both locales, reduced motion |
| `admin`     | 404 unauthenticated, with a forged Supabase cookie, and with invented `isAdmin` cookies; no data or route name in the refusal; organiser endpoints refusing strangers; absent from sitemap; linked from nowhere                           |

`preloader` needs no Supabase. `admin` needs the three Supabase variables to be
**present but may point nowhere** — an unreachable URL is enough to exercise
the gate, and is how it is run here.

## What is not covered any more

Earlier phases had suites for the shop drawer, tickets, the payment return,
filters, the slider, the cursor and the SEO head. Those files were in the
scratch directory and are **gone**. Their coverage now rests on the unit tests
in `tests/*.test.ts` and on manual checking. Rewriting them is worthwhile; it
has not been done.
