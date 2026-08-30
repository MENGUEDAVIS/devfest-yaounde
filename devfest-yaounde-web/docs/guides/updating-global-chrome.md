# Updating the Navbar, Announcement Banner, and Footer

These three pieces appear on every page of the site. This guide is for changing what they say or link to — not for redesigning how they look.

## Changing the announcement banner message

The banner text lives in the translation files, not in any component code:

- French: `messages/fr.json` → `announcement.message`
- English: `messages/en.json` → `announcement.message`

Edit both — the site requires both languages before a change counts as "done." Keep it short; long messages scroll (marquee), which is fine, but very long text is harder to read while scrolling.

**To hide the banner entirely** for now, an organizer without dev help would need to ask a developer to remove it from `src/components/global/GlobalChrome.tsx` — there's no on/off toggle yet. Note that visitors can dismiss it themselves; the navbar then smoothly collapses the space and the whole bar morphs into a pill. If frequent on/off toggling turns out to be needed, that's worth a small follow-up feature (a `announcement.enabled` flag in the messages file or a config file), not something to hack in on the spot.

## Changing nav links, Shop/Get Tickets button labels

Labels: `messages/fr.json` and `messages/en.json` → `nav.*` keys.

Adding or removing an actual link (not just relabeling) requires a code change in `src/components/global/Navbar.tsx` (the `NAV_LINKS` array) — a developer task, not a content-only edit.

## Changing footer links and social profiles

- **Link labels** (e.g. "Schedule", "Join the Community"): `messages/fr.json` / `messages/en.json` → `footer.*` keys.
- **Where links actually point** (social profile URLs, the Bevy community URL, Privacy Policy / Code of Conduct pages): `src/lib/site-config.ts`. Every URL in that file is currently a `#` placeholder — replace them with the real ones. This is the one file to check before launch.

## Known gaps as of this bootstrap

- **No real logo image** — the navbar shows a text wordmark ("DevFest Yaoundé") since no logo asset was supplied. Swapping in a real logo is a `Navbar.tsx` code change.
- **No real community photos** — the footer's top strip is a flat Yellow 600 CTA block, not an actual photo strip. `DESIGN.md` §4.1 requires real photos here; this needs a developer to swap in actual images once they exist. (It was a gradient block until the design-foundation pass; gradients are now banned outright per `DESIGN.md` §2.6, so whatever replaces it must be flat fills or real photography.)
- **Privacy Policy and Code of Conduct have no pages yet** — `PAGES.md` §1.3 links to them from the footer, but neither is in the sitemap (`PAGES.md` §0). Until that's resolved (new routes vs. an external doc), their footer links are `#` placeholders in `site-config.ts`.
- **Bevy chapter URL is a placeholder** — every "RSVP" / "Join the Community" link points at `#` until the real GDG Yaoundé Bevy URL is added to `site-config.ts`.

## The logo easter egg

Clicking the "DevFest Yaoundé" wordmark 6 times quickly (within about 1.5 seconds) triggers a confetti burst. This is documented in `/EASTER-EGGS.md` — check there before adding a new easter egg so it doesn't collide with this one.

## Phase 7: the footer changed shape

The footer is now a **full-page closing moment** (about one screen tall) with
a mixed layout: an oversized DevFest wordmark on one side, the three link
groups on the other, then an invitation band with a ticket button, then the
social icons and copyright line.

The big community-photo block with the RSVP button on it **has been removed**
— both because the photo/CTA block wasn't wanted, and because the RSVP action
itself was retired (`docs/decisions/0008-retire-bevy-rsvp.md`). The footer's
main button now goes to `/tickets`.

Editing footer links and labels is unchanged: labels live under `footer.*` in
`messages/fr.json` / `messages/en.json`, and the actual URLs (socials, Bevy,
Privacy, Code of Conduct) are still all in `src/lib/site-config.ts`.
