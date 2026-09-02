# SEO, and what a pasted link looks like

Everything that decides how the site appears in a search result or unfurls in
a chat window lives in three files. If a page's preview looks wrong, one of
these is why.

| File                     | Job                                                               |
| ------------------------ | ----------------------------------------------------------------- |
| `src/lib/site-config.ts` | `SITE_URL` — the canonical origin, one edit for the whole site    |
| `src/lib/seo.tsx`        | `pageMetadata()` — title, description, canonical, hreflang, cards |
| `src/lib/event.ts`       | The event's own facts, and the structured data built from them    |
| `src/app/og/route.tsx`   | The social image, rendered on demand                              |
| `src/app/sitemap.ts`     | Every indexable URL, in both languages                            |
| `src/app/robots.ts`      | What crawlers may and may not follow                              |

## Adding metadata to a new page

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.yourPage" });
  return pageMetadata({
    locale,
    path: "/your-page",
    title: t("title"), // BARE. The layout adds "· DevFest Yaoundé".
    description: t("metaDesc"),
  });
}
```

That one call produces the canonical URL, `hreflang` for both locales plus
`x-default`, the OpenGraph block, the Twitter card and the social image URL.
Doing it per page by hand is the kind of job that goes well on the first three
pages and is forgotten on the rest, which is why there is a helper.

Pass `index: false` for anything personal — an account area, a bag, a payment
return. **Then remove it from `sitemap.ts` too**: a sitemap entry for a
`noindex` page invites a crawler somewhere it is then told to ignore. The two
lists have to agree, and a check asserts that they do.

## `hreflang`, and why it matters here

A bilingual site without it competes with itself: `/fr/tickets` and
`/en/tickets` look like two pages about the same thing, and a search engine
picks one and buries the other. The alternates say "these are translations",
so the right one is served to the right person. Every page emits all three
(`fr`, `en`, `x-default` → French), and the sitemap repeats them per entry.

## The social image

`/og?title=…&subtitle=…` renders a 1200×630 PNG. One route for every page,
because the headline is the only thing that differs and a dozen hand-made PNGs
would drift from the brand the first time a colour moved.

It is the DEFAULT yellow, not the visitor's chosen theme. The image is baked
once and cached by whoever unfurls the link, so it cannot follow a per-visitor
setting — pretending otherwise would just make the cache lie.

**Product pages override it** with the product's own photograph. A real
picture of the thing beats a rendered title card when the link is to something
someone can buy.

`/og` is excluded from the locale proxy's matcher. Left in, every unfurl got a
307 to `/fr/og`, and the stricter chat clients follow no redirects and showed
no image at all.

## Structured data

- **`Organization`** — on every page, from `organizationJsonLd()`. Nothing in
  it is speculative, so it is always emitted.
- **`Product`** — on each product page, with price and availability.
- **`Event`** — **not emitted yet, on purpose.**

`startDate` is required by schema.org, and the event date is still
unconfirmed (`EVENT_BASE_DATE` in `calendar.ts` is `null`). An Event block
without a start date is invalid data that Search Console reports as an error,
and no rich result comes from it either way. Inventing a date would be worse:
it would publish a wrong one to every crawler that read it.

So `eventJsonLd()` returns `null` and renders nothing, and **switches itself
on the moment `EVENT_BASE_DATE` is set** — the same flag that reveals the
add-to-calendar buttons. One edit, both features, and no third place to
remember. The venue in `src/lib/event.ts` is the other blank: fill `venue` and
`venueStreet` and the `Place` in the rich result becomes an address instead of
just "Yaoundé".

## Checking it

`docs/setup/deployment.md` has the pre-launch list. Quickly, by hand:

```bash
curl -s https://DOMAIN/en/tickets | grep -E 'canonical|hreflang|og:|twitter:'
curl -s https://DOMAIN/robots.txt
curl -s https://DOMAIN/sitemap.xml | head -40
curl -sI 'https://DOMAIN/og?title=Test'      # image/png, 1200x630
```

The automated check asserts all of it across every public page in both
locales: title, description, canonical, all three alternates, five OpenGraph
fields, the Twitter card, that the image each page names actually resolves,
and that no public page is `noindex`.
