# Updating the Home Page

Everything visible on the home page is either translation copy (`messages/fr.json` / `messages/en.json`) or structured content data (`src/data/*.json`). You shouldn't need to touch component code (`src/components/home/`) just to swap in real content.

## What's placeholder right now — replace all of this before launch

| File                                                              | Feeds                                                                                   | What to do                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/speakers.json`                                          | Speaker Showcase preview + speaker modal                                                | Replace the 6 fake entries (Jane Doe, Kwame Asante, etc.) with real speakers. `featured: true` controls who shows up in the Home preview carousel — the full roster lives on `/speakers` once that page is built (Phase 4). |
| `src/data/sponsors.json`                                          | Hero sponsor logo marquee                                                               | Replace the 5 fake companies (Acme Cloud, Globex Systems, etc.) with real sponsor names, logos, and website links.                                                                                                          |
| `src/data/stats.json`                                             | Stats interstitial (the animated count-up numbers)                                      | Replace `500+ developers` / `40+ speakers` / `1 unforgettable weekend` with real figures once known — these were taken directly from `PAGES.md`'s own example text, not invented.                                           |
| `src/data/quotes.json`                                            | Rotating quotes interstitial                                                            | Replace the 3 fake testimonials with real community quotes (get permission to use people's names/quotes first).                                                                                                             |
| `src/data/past-editions.json`                                     | Hero photo collage **and** Memory Lane photo grid (same 4 files, reused in both places) | Replace the 4 placeholder color-block SVGs with real past-edition photos. See "Real photos" below — this is the biggest visual jump once done.                                                                              |
| `src/data/faqs.json`                                              | FAQ preview section                                                                     | Replace the 4 generic Q&As with real ones. The full `/faqs` page (Phase 4) will likely use a larger set — this file can grow into that, or get superseded by it.                                                            |
| `home.hero.dates` / `home.hero.venue` (in both `messages/*.json`) | Hero                                                                                    | Currently say "Dates to be announced" / "Yaoundé, Cameroon" — update once the actual dates and venue are confirmed.                                                                                                         |

Every JSON file above has both an `fr` and `en` value for translatable fields — fill in both, not just one, before calling a content update "done" (per the bilingual rule).

## Real photos and `MorphedImageFrame`

`src/components/ui/MorphedImageFrame.tsx` (the blob-shaped photo frame) takes a plain image URL — swapping a placeholder SVG for a real JPG/PNG is just changing the `photoUrl` / `logoUrl` / `imageUrl` field in the relevant JSON file, no code change needed. Put real image files under `public/` (e.g. `public/speakers/jane-doe.jpg`) and reference them the same way the placeholders under `public/placeholders/` are referenced now.

## What's NOT placeholder — skipped or genuinely open

- **Tracks section** (`PAGES.md` §2.6) — not built at all. Tracks aren't confirmed for this year; inventing track names/icons wasn't an option. If tracks get confirmed, this is a new section to add, not a placeholder to fill in — ask a developer.
- **Schedule Overview preview** — the "Day 1 / Day 2" tabs and session titles in `src/components/home/ScheduleOverviewPreview.tsx` are hardcoded illustrative placeholders (not sourced from a data file), since no real schedule/session data exists yet. This is Phase 4 territory (`/schedule` page) — once real session data exists, this component should be rewired to source from it rather than edited by hand.
- **"See full lineup" / "See full schedule" / "More questions?" links** — these already point at `/speakers`, `/schedule`, `/faqs`, which exist as "coming soon" placeholder pages from the initial scaffold. They'll start showing real content once Phase 4 builds those pages out — no link changes needed here.

## Component reference

If you do need a developer to change how a section looks (not just its content), each shared building block is documented under `docs/components/` — see that folder for `Button`, `Badge`, `SectionContainer`, `MorphedImageFrame`, `IconWrapper`, `StatCounter`, and `Modal`.
