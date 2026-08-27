---
name: devfest-content-model
description: Use when creating or editing a page/route in the DevFest Yaoundé site, or when working with content data — speakers, schedule/sessions, ticket tiers, or shop products. Condensed sitemap, per-page content structure, and data shapes from docs/content/PAGES.md.
---

# DevFest Yaoundé Content Model

Source of truth: `docs/content/PAGES.md`. Pairs with the `devfest-design-system` skill (how things look) and `devfest-i18n` skill (bilingual requirement — every route/content type below ships in both `/fr` and `/en`).

## Sitemap

| Route | Page | Auth |
|---|---|---|
| `/` | Home — single scrolling story, teasers only | public |
| `/schedule` | Full agenda, all days | public |
| `/speakers` | Full speaker grid | public |
| `/faqs` | Grouped, searchable FAQ | public |
| `/team` | Organizers | public |
| `/tickets` | Buy/manage tickets | auth required to track own tickets |
| `/shop` | Merch store, evergreen (live year-round, independent of ticket windows) | auth required to track own orders |
| `/dp-generator` | Standalone DP generator, no login, no dependency on rest of site's auth | public |
| *(external)* | GDG Bevy chapter page — RSVP source of truth | linked from Home hero, nav, footer |

Every route exists under both `/fr/...` and `/en/...`.

## Global chrome (present on every page)

- **Navbar**: floating pill, fixed top with offset. Logo (left) — Schedule · Speakers · FAQs · Team (center) — Shop (secondary btn) + Get Tickets (primary btn) (right). Lang switcher near ticket button. Shrinks + gains blur/shadow on scroll. Mobile: hamburger → sheet.
- **Announcement banner**: above navbar, dismissible (persisted), marquee-scrolls longer messages, visually attached to navbar. Time-sensitive use only.
- **Footer**: community photo strip + "Be part of the story — RSVP now" (→ Bevy). Link groups: **Event** (Schedule/Speakers/Team/FAQs), **Get Involved** (Shop/DP Generator/Bevy/RSVP), **Legal** (Privacy/Code of Conduct). Social icons (Phosphor, 24px). Copyright line in mono. Can go full Black 02 dark.

## Home page section order

1. Hero — event name+year, city, dates/venue, morphed-frame photo collage/carousel, CTAs (Get Tickets primary / Shop secondary / RSVP Bevy tertiary), sponsor logo marquee.
2. "What is DevFest Yaoundé" — warm community paragraph + this year's theme.
3. Playful interstitial #1 — stat counter / animated quote, pure vibe, no dense info.
4. Speaker Showcase preview — featured speakers only, opens shared speaker modal, "See full lineup" → `/speakers`.
5. Schedule Overview preview — day tabs only + 2-3 highlight sessions/day, "See full schedule" → `/schedule`.
6. Tracks (optional) — icon/illustration grid if the event has tracks.
7. Playful interstitial #2 — rotating community quotes/tweets, speech-bubble cards.
8. Memory Lane — past edition recap video + photo grid.
9. Community CTA — GDG Yaoundé blurb + Join the Community → Bevy.
10. FAQ preview — 3-4 inline questions, "More questions?" → `/faqs`.
11. Footer.

## Data shapes

```ts
interface Speaker {
  id: string; // slug, e.g. "jane-doe" — used in /speakers?spk=jane-doe
  name: string; // language-neutral
  role: LocalizedString;
  company: string; // language-neutral
  photoUrl: string; // rendered in morphed frame
  bio: LocalizedString;
  sessionIds: string[]; // links to Session.id
  social?: { x?: string; linkedin?: string; website?: string }; // only rendered if provided
  featured?: boolean; // true = appears in Home preview carousel
}

interface Session {
  id: string;
  title: LocalizedString; // or language-neutral + originalLanguage tag if speaker submitted in one language only
  description: LocalizedString; // one-line
  day: number; // 1-indexed event day
  startTime: string; // ISO or "HH:mm"
  endTime: string;
  speakerIds: string[];
  track?: string; // color-coded per design system §2.5-adjacent track tagging
  room?: string;
}

interface TicketTier {
  id: string; // e.g. "haikyu", "sonnet" — rendered in mono-tag style
  name: string; // e.g. "HAIKYU" — language-neutral (proper noun tier name)
  priceXAF: number; // 0 for free tier
  description: LocalizedString;
  perks: LocalizedString[]; // rendered with Phosphor check icons
  includesApparel: boolean; // if true, collect T-shirt size in attendee details step
  quantityAvailable?: number;
}

interface Product {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  priceXAF: number;
  images: string[];
  variants?: { size?: string[]; color?: string[] };
  status: 'pre-order' | 'in-stock' | 'venue-only' | 'sold-out'; // always paired with a visible text label, never color alone
}

interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString; // e.g. "Lead Organizer", personality-forward one-liner allowed
  subTeam?: string; // Design / Logistics / DevRel / Community — confirm real org chart, currently an open question (PAGES.md §11)
  photoUrl: string;
  oneLiner: LocalizedString; // e.g. "Keeps the Wi-Fi (and the vibes) running."
  social?: { x?: string; linkedin?: string; website?: string };
  alumni?: boolean; // true = renders in "Past Organizers" section
}

interface FaqItem {
  id: string;
  category: 'general' | 'tickets' | 'venue' | 'shop' | 'code-of-conduct';
  question: LocalizedString;
  answer: LocalizedString; // can contain links (e.g. pricing Q -> /tickets)
}

type LocalizedString = { fr: string; en: string };
```

## Page-specific structure notes

- **Schedule**: day tabs + view toggle (Structured/timeline = hero experience; Grid/List = first-class a11y citizen, not an afterthought). Filters by track/room. Session card: time, title, one-liner, speaker avatar+name (→ modal), track tag, room. Add-to-calendar per session. Empty state keeps brand voice ("Schedule's still cooking — check back soon").
- **Speakers**: grid (morphed-frame photo, name, role+company, social icons), search + track/day filter, consistent card size regardless of bio length (bio lives in modal only). Modal shared with Home preview, deep-linkable via query param, opens with a shared-element "grow from card" transition.
- **FAQs**: accordions grouped by category (General / Tickets & Pricing / Venue & Logistics / Shop-Swag / Code of Conduct), live search filter, short conversational answers.
- **Team**: grouped by sub-team if org chart supports it, else one grid. Optional Alumni/Past Organizers section lower on page.
- **Tickets**: 5-step flow — (1) tier select + quantity, (2) per-attendee details (name/email/+size if apparel tier, "Ticket N of M" indicator), (3) optional discount code, (4) payment (Mobile Money lead, card secondary — provider TBD per `0003-payments-and-auth.md`), (5) confirmation (celebratory animation + email receipt + QR/badge code). Sticky order summary steps 1-4. Requires shared account for "My Tickets" dashboard.
- **Shop**: evergreen product grid with status pills, product detail with variant/qty selection, checkout reuses Tickets' step pattern, image right-click/selection disabled (soft deterrent, not real protection — consider a watermark if stronger protection is needed later), "My Orders" in shared account dashboard.
- **DP Generator**: no login, no shared design-system auth dependency. Flow: nickname → upload photo → pick branded background/frame (morphed-shape motif) → position/crop → download → share-to-socials (prefilled caption+hashtag, or copy-to-clipboard fallback). Canvas compositing only, no AI/Gemini integration.

## Shared systems

- **Auth**: one account shared between Tickets and Shop (`/account` with Tickets/Orders tabs). Provider not yet decided — see `docs/decisions/0003-payments-and-auth.md`. Home/Schedule/Speakers/FAQs/Team/DP Generator stay fully public.
- Every content type above must exist in both languages before a feature is "done" — see `devfest-i18n` skill for exactly which fields are translatable vs. language-neutral.
