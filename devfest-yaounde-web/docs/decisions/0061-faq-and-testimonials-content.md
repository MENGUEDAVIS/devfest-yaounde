# 0061 — Real FAQ content, four more testimonials, a visible contact line

Date: 2026-09-16
Status: Accepted (PHASE22 §B)

## 1. The placeholder sweep found nothing new

Before writing content, the whole site was checked for visible lorem/TODO/sample-filler text that a visitor could actually see. There wasn't any beyond what `docs/guides/updating-content.md`'s "still placeholder" table already tracks (`speakers.json`, `sessions.json`, `team.json` — out of scope for this part) — every "coming soon" string and every `"#"` URL on the site is already gated behind `isPlaceholderUrl` or an equivalent guard, so nothing renders a dead link or a raw sample string. This part's real content work was §B2/§B3.

## 2. `faqs.json` rewritten with confirmed answers

The 12 previous entries were plausible but explicitly flagged as unconfirmed (`updating-content.md`: "not confirmed policy"). Replaced with 22 entries across the same five categories (`general`, `tickets`, `venue`, `shop`, `code-of-conduct` — no new category needed), written against the actual shipped behaviour rather than assumed:

- **The event date was corrected, not copied verbatim.** The brief's draft answer said a single date, November 21, 2026. `lib/event.ts` states the CONFIRMED dates as two Saturdays — 21 and 28 November 2026, confirmed by the organisers on 2026-09-08 — so the FAQ answer says both, matching `EVENT_DATES` rather than contradicting it.
- **The free-ticket answer was checked against `TicketCheckout.tsx`, not assumed.** ADR 0008 retired Bevy as a homepage-level RSVP alternative, which could easily be misread as "Bevy is gone" — it isn't. `ticket-tiers.json`'s `haikyu` entry still carries `rsvpExternal: true`, and `TicketCheckout.tsx` still renders the free tier as "handled entirely off-site" via the community platform. The FAQ answer describes that real, current mechanism.
- **The shop pickup/delivery answer was corrected against `ShopCheckout.tsx`.** The brief's draft said "we'll reach out to coordinate" after checkout; the actual UI is a pickup-vs-shipping toggle chosen live in the order summary. Answer rewritten to match what the checkout actually does.
- **No FAQ hardcodes a settings-driven URL.** The Call-for-Speakers and Bevy links are both admin-editable (`site_settings.cfs`, `.bevy_url`) — baking today's value into static JSON content would drift the moment an organiser edits the setting. Both answers instead point at the PAGE that already renders the live value (Speakers page banner, Tickets page), the same pattern the code-of-conduct category already uses for `participationTermsUrl`. Only stable, non-setting destinations (`/tickets`, `/shop`, `/speakers`, `/schedule`, `mailto:gdgyaounde@gmail.com`) got a `cta`.
- French answers are native rewrites of the same information, not literal translations, per the brand-voice skill's standing rule.

## 3. Four more testimonials, attributed by role only

`quotes.json` goes from 3 to 7. The three from ADR 0059 stay — this adds a volunteer (×2), an organiser, and a sponsor voice, each attributed by role rather than a name, matching the site's own hard rule ("Never invent a name for a quote" — `updating-content.md`).

**Provenance, stated plainly, same as ADR 0059 was:** these four are text supplied verbatim by the person running this repo's content, not a quote independently sourced from a named volunteer/organiser/sponsor with their own signed-off permission. That is a different kind of "real" than the rule is written to police — the rule exists to stop a name being invented under a quote nobody said; these carry no name, and the person authoring the site's content is the one putting the words there. It is not the same as an unprompted invention, but it is also not a verified first-person quote, and the honest record is to say so rather than imply otherwise.

`QuotesInterstitial`'s rotation and its dot indicators are already driven by `quoteList.length` with no hardcoded assumption of 3, so seven rotates correctly with no component change.

## 4. A visible general contact line, not just one FAQ answer

`gdgyaounde@gmail.com` (`CHAPTER_EMAIL`, already a `site-config.ts` constant used elsewhere for mailto links) now also appears as its own line in the footer's closing band, under the copyright row — so it's reachable from every page, not only for someone who happens to open the "who do I contact" FAQ. Baked into both locale strings directly (`footer.contact`), the same way `wall/page.tsx`'s takedown hint already does it: `CHAPTER_EMAIL` is a repo constant, not a dashboard setting, so there is no drift risk in writing it into the translated string.

## Verified

- `faqs.json`/`quotes.json` parse and pass `collectionSchemas` validation (`npm test`).
- FAQ page screenshotted in both locales: all five categories render with the right item counts, the code-of-conduct category still auto-appends "Read the participation terms," and the new `mailto:` CTA renders and expands correctly.
- Footer contact line screenshotted, confirmed present and legible against the dark footer background in both themes' shared dark chrome.
- `QuotesInterstitial` confirmed unaffected by the count change (rotation logic reads `.length`, no hardcoded index).
- `npm run verify` (188 tests, lint, typecheck) and `npm run build` pass. No new dependency; no gradients introduced.

## Consequences

- The free-ticket and CFS FAQ answers point at pages rather than raw URLs on purpose — if an organiser changes `site_settings.cfs.url` or `.bevy_url`, the FAQ text needs no edit, because it never named the URL.
- Testimonial authorship note above applies to all 7 entries going forward, not only the new 4 — if a real, individually-sourced testimonial arrives later (with a name and consent), it should say so explicitly rather than sitting indistinguishably among these.
