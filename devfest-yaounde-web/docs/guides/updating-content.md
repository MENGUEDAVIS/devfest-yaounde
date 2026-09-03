# Updating the content

This is the guide for the things you'll actually change year to year:
speakers, sessions, FAQs and the team.

**The live way:** sign in as an organiser, open `/en/admin` → Content.

1. Publish the names — JSON, or a speakers/team CSV of the basic columns.
   Photos can wait. If the sheet leaves `photoUrl` empty, a picture already
   on that id is kept.
2. Under **Photos still needed**, upload one file per remaining profile.
   Empty, `#` and `/placeholders/…` count as missing.

Until a collection is published the site still reads the files below. After
you publish, editing the file does nothing until you publish again. See
ADR 0031 and 0032.

**The repo way** (still valid as the seed, and for a reviewable diff):
all four live as JSON files under `src/data/`. Copy an existing entry, change
the values, done — then publish from the dashboard if the collection is
already live.

Two rules that apply to every file here:

1. **Both languages, always.** Any field written as `{ "fr": "...", "en": "..." }`
   needs both filled in. A missing language will break the build for that
   page, which is deliberate — it's better than shipping half-translated.
2. **`id` must be unique** within its file, and shouldn't change once
   people might have linked to it (speaker ids appear in shareable URLs).

---

## Adding a speaker — `src/data/speakers.json`

```json
{
  "id": "ama-nkeng",
  "name": "Ama Nkeng",
  "role": { "fr": "Ingénieure plateforme", "en": "Platform Engineer" },
  "company": "Some Company",
  "photoUrl": "/speakers/ama-nkeng.jpg",
  "bio": {
    "fr": "Deux ou trois phrases, à la première ou troisième personne.",
    "en": "Two or three sentences, first or third person."
  },
  "track": { "fr": "Cloud", "en": "Cloud" },
  "day": 1,
  "sessionIds": ["s1-keynote"],
  "social": { "x": "https://...", "linkedin": "https://..." },
  "icebreakerQuestion": {
    "fr": "Quelle citation te motive ?",
    "en": "What's a quote that keeps you going?"
  },
  "icebreakerAnswer": {
    "fr": "Une phrase courte, dans leurs mots.",
    "en": "One short line, in their own words."
  },
  "funnyMoment": {
    "fr": "Optionnel — une anecdote courte et sympa.",
    "en": "Optional — one short, shareable story."
  },
  "featured": true
}
```

- **`icebreakerQuestion` / `icebreakerAnswer`** are the personality beat — they
  show up as a pull-quote in the detail reveal, not as a table row. Ask
  something a human would actually ask ("what's a quote that keeps you
  going?"), and keep the answer to one line. This is the field most likely to
  make someone smile, so it's worth getting real answers rather than filler.
- **`funnyMoment`** is **optional**. Leave the whole field out if there isn't
  one — an empty string will render an empty box. It appears as a "true story"
  aside.

- **`photoUrl`** — put the image in `public/` (e.g. `public/speakers/`) and
  reference it from there. Roughly square works best; the card crops to 4:5.
- **`track`** and **`day`** drive the filters on `/speakers`. Reuse an
  existing track name exactly, or you'll create a new filter chip.
- **`social`** — include only the networks they actually have. Leave the
  others out entirely; empty strings will render a dead icon.
- **`featured: true`** puts them in the auto-advancing slider on the home
  page. Four or five featured speakers is about right — the slider gets slow
  to cycle beyond that. Everyone appears on `/speakers` regardless.
- **`sessionIds`** links them to sessions (below). It's what makes their name
  appear on a session card. Safe to leave as `[]` until the programme exists.

---

## Adding a session — `src/data/sessions.json`

```json
{
  "id": "s1-cloud-talk",
  "time": "14:00",
  "durationMin": 40,
  "day": 1,
  "kind": "talk",
  "title": { "fr": "...", "en": "..." },
  "description": { "fr": "...", "en": "..." },
  "track": { "fr": "Cloud", "en": "Cloud" },
  "room": { "fr": "Salle B", "en": "Room B" },
  "tags": [{ "fr": "Intermédiaire", "en": "Intermediate" }],
  "bring": { "fr": "Ton laptop.", "en": "Your laptop." },
  "provided": { "fr": "On fournit le wifi.", "en": "We provide wifi." },
  "speakerIds": ["ama-nkeng"]
}
```

- **`kind`** must be one of `talk`, `workshop`, `panel`, `break`. It picks the
  icon and label on the card.
- **`time`** is 24-hour `"HH:mm"`. Sessions sort by it automatically, so you
  don't need to keep the file in order.
- **`bring`** and **`provided`** are optional — omit them entirely for
  sessions where they don't apply (most talks). They only render when present.
- **`speakerIds`** must match ids in `speakers.json`. A typo just means the
  speaker silently doesn't appear, so double-check them.
- Sessions show up on both the home page preview and `/schedule` — there's
  only one list.

### Turning on "add to calendar"

The add-to-calendar buttons are **deliberately hidden** right now, because the
event date isn't confirmed and we won't export a calendar entry on a made-up
day. To switch them on, open `src/lib/calendar.ts` and set:

```ts
export const EVENT_BASE_DATE: string | null = "2026-11-14"; // day 1, YYYY-MM-DD
```

Day 2 is worked out automatically as the following day. The buttons appear on
`/schedule` as soon as that's set.

---

## Adding an FAQ — `src/data/faqs.json`

```json
{
  "id": "faq-parking",
  "category": "venue",
  "question": { "fr": "...", "en": "..." },
  "answer": { "fr": "...", "en": "..." }
}
```

- **`category`** must be one of: `general`, `tickets`, `venue`, `shop`,
  `code-of-conduct`. Anything else won't display — the page only renders the
  five known categories, in that order.
- Categories with no questions are hidden automatically, so you can't end up
  with an empty heading.
- Keep answers short and conversational. The search box matches both the
  question and the answer text.

---

## Adding a team member — `src/data/team.json`

```json
{
  "id": "organizer-7",
  "name": "Real Name",
  "role": { "fr": "Logistique", "en": "Logistics" },
  "oneLiner": {
    "fr": "Une phrase avec de la personnalité, pas une bio formelle.",
    "en": "One line with personality, not a formal bio."
  },
  "photoUrl": "/team/real-name.jpg",
  "social": { "linkedin": "https://..." },
  "contribution": { "fr": "Logistique", "en": "Logistics" },
  "icebreakerQuestion": { "fr": "...", "en": "..." },
  "icebreakerAnswer": { "fr": "...", "en": "..." },
  "funnyMoment": { "fr": "...", "en": "..." }
}
```

- **`contribution`** is what the team page **groups and filters by** — reuse an
  existing value exactly (Organising, Design, Logistics, Sponsoring, Ushering,
  Programme), or you'll create a new one-person group. A new value is fine when
  it's genuinely a new kind of contribution; it appears as a group and a filter
  chip with no code change.
- **Icebreaker and funny moment** work exactly as they do for speakers (above),
  and render through the same component.

- **`oneLiner`** is the point of this page — "keeps the Wi-Fi (and the vibes)
  running" beats "responsible for infrastructure operations".
- To move someone to the **past organizers** section, add
  `"alumni": true` and `"years": "2024"`. They keep their entry; it just moves
  down the page. Nobody gets deleted — that's the multi-year community story.

### How the team page is organised

Organizers are grouped **by contribution**, not by a sub-team org chart —
because the real reporting structure was never confirmed, and inventing one
would have been worse than not having it. See
`docs/decisions/0010-team-grouping.md`.

This means you control the grouping purely by what you put in
`contribution`. If a real sub-team structure is confirmed later, the page can
be regrouped — it's driven by one field, so it's a small change.

---

## What's still placeholder

Everything in all four files is placeholder and needs replacing:

| File                   | What's fake                                                |
| ---------------------- | ---------------------------------------------------------- |
| `speakers.json`        | All 14 entries — invented names, companies and bios        |
| `sessions.json`        | All 8 — invented titles, times, tracks and rooms           |
| `faqs.json`            | All 12 — plausible answers, but not confirmed policy       |
| `team.json`            | All 8 — every name literally reads "Placeholder Organizer" |
| `public/placeholders/` | Every image is a flat colour block, not a photo            |

The images make the biggest visual difference. Swapping in real community
photos will change how the site feels more than any styling change.
