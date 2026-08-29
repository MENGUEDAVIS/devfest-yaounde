# DevFest Yaoundé — Pages & Content Guide

### Companion to DESIGN.md — defines what lives on every page, and why

---

## 0. Sitemap

| Route           | Page                  | Notes                                                                                                                                                                       |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Home                  | Main scrolling landing                                                                                                                                                      |
| `/schedule`     | Schedule              | Full agenda, all days                                                                                                                                                       |
| `/speakers`     | Speakers              | Full grid, all speakers                                                                                                                                                     |
| `/faqs`         | FAQs                  | Grouped, searchable                                                                                                                                                         |
| `/team`         | Team                  | Organizers                                                                                                                                                                  |
| `/tickets`      | Tickets               | Buy / manage tickets (auth required to track)                                                                                                                               |
| `/shop`         | Shop                  | Merch store, live year-round                                                                                                                                                |
| `/dp-generator` | DP Generator          | Standalone, no login, can even live on a subdomain like Lagos does                                                                                                          |
| _(external)_    | GDG Bevy chapter page | ~~RSVP source of truth~~ — **superseded, see `docs/decisions/0008-retire-bevy-rsvp.md`**. Bevy is the _community home_ only now; the way into the event is the ticket flow. |

Every route above exists in **both languages** (see §9 Localization) — e.g. `/fr/` and `/en/` prefixes, with a persistent switcher.

---

## 1. Global Chrome

### 1.1 Navbar

- **Floating**, pill-shaped, fixed at top with a small offset from the viewport edge (not flush) — this alone makes it feel less "default template."
- Layout: **Logo** (far left) — **Schedule · Speakers · FAQs · Team** (center) — **Shop** (secondary button, outline style) + **Get Tickets** (primary button, filled, core color) (far right). Language switcher (EN/FR toggle) sits just before or after the ticket button, small and unobtrusive.
- On scroll: navbar shrinks slightly and gains a soft shadow/blur background (glass effect) — a small, satisfying micro-animation (ease-out, ~200ms).
- Mobile: collapses into a hamburger; the floating pill can morph into a rounded sheet that slides down — this transition is itself a fun **macro** animation moment (bouncy easing).
- **Easter egg idea:** clicking the logo rapidly (5–7 times) triggers a burst of halftone confetti shapes across the navbar, or briefly morphs the logo into a goofy alternate version for a second. Log this (and future ones) in `/EASTER-EGGS.md` per DESIGN.md §6.3.

### 1.2 Announcement Banner

- Sits above the navbar, dismissible (persists dismissal via localStorage/cookie for the session).
- **Marquee scroll** behavior for longer messages (e.g. "🎟️ Early bird tickets end in 3 days — grab yours before prices go up!").
- Visually attaches to the navbar (shared rounded container or touching edge) so they read as one cohesive unit, not two competing bars.
- Used sparingly and only for genuinely time-sensitive updates — ticket deadlines, schedule changes, weather/venue alerts.

### 1.3 Footer (full, DevFest-Lagos-style)

- **Top:** ~~a wide community photo strip with an overlaid _"Be part of the story — RSVP now"_ CTA linking to Bevy.~~ **Superseded twice:** the photo+CTA block was dropped entirely (PHASE7 §7) for a mixed-layout full-page composition, and the RSVP framing was retired (`docs/decisions/0008-retire-bevy-rsvp.md`) for a ticket CTA.
- **Link groups**, clearly separated:
  - **Event**: Schedule, Speakers, Team, FAQs
  - **Get Involved**: Shop, DP Generator, Join the Community (Bevy) — _the RSVP item was removed, see `docs/decisions/0008-retire-bevy-rsvp.md`_
  - **Legal**: Privacy Policy, Community Guidelines/Code of Conduct
- **Follow us:** social icons (X, Instagram, LinkedIn, YouTube, Facebook — whichever are active), Phosphor icons at 24px.
- **Bottom line:** © [year] DevFest Yaoundé · GDG Yaoundé — small, quiet, Mono type.
- Background: can be the one place on the site that goes full Black 02 dark, for contrast and a strong "closing" feeling to the scroll.

---

## 2. Home Page (`/`)

The home page is a **single scrolling story** — teasers everywhere, full detail lives on dedicated pages.

1. **Hero**
   - Big bold headline: event name + year (`display-xl`), city.
   - Dates + venue, clearly stated.
   - Background/foreground: a collage or auto-playing carousel of **last edition's photos**, masked into the morphed-shape frames from DESIGN.md §4.2.
   - Primary CTA: **Get Tickets** → `/tickets`. Secondary: **Shop** → `/shop`. ~~Tertiary: RSVP on GDG Bevy~~ — removed, see `docs/decisions/0008-retire-bevy-rsvp.md`.
   - Sponsor/partner logo marquee (linear-eased, continuous scroll, like Lagos's) directly under the hero — bold and boastful, sponsors deserve prime real estate.

2. **What is DevFest Yaoundé** (community + this year's direction)
   - Short, warm paragraph: what DevFest is, what GDG Yaoundé is, and a line specific to _this_ year's theme/focus (AI, cloud, whatever the direction is).
   - This is the section that carries the "friendly, welcoming, casual" voice hardest — write it like a community member talking to a friend, not a press release.

3. **Playful interstitial** (breathing room #1)
   - A short animated quote, stat counter (e.g. "500+ developers, 40+ speakers, 1 unforgettable weekend"), or a big typographic moment with a decorative blob shape. No dense information here — pure vibe.

4. **Speaker Showcase (preview)**
   - Horizontal scroll/carousel of **featured** speakers only (not the full roster) — photo (morphed frame), name, role, company.
   - Clicking a card opens the **speaker modal** (same modal used on `/speakers`, see §4.2) — so this preview isn't a dead end, it's a real entry point.
   - "See full lineup" → `/speakers`.

5. **Schedule Overview (preview)**
   - Day-tab teaser (just the days, not every session) with 2–3 highlight sessions per day.
   - View toggle preview isn't needed here — keep it simple, full toggle lives on `/schedule`.
   - "See full schedule" → `/schedule`.

6. **Tracks** (optional, DevFest-Lagos-style)
   - If the event has tracks (AI, Web, Cloud, Design, etc.), a fun icon/illustration grid — this is a great place for bold Phosphor duotone icons at large size.

7. **Playful interstitial** (breathing room #2)
   - Rotating community quotes/tweets from past editions, in speech-bubble-styled cards.

8. **Memory Lane / Past Edition Recap**
   - Recap video link + photo grid from last year(s) — this is what proves the community is real and has history, which matters a lot for a "template built to last across years."

9. **Community CTA**
   - "What is GDG Yaoundé up to?" — short blurb + **Join the Community** button → Bevy chapter page. This is the section that gives Bevy "more value" as you described, rather than just being a silent RSVP redirect.

10. **FAQ Preview**
    - 3–4 most common questions inline, "More questions?" → `/faqs`.

11. **Footer** (§1.3)

---

## 3. Schedule Page (`/schedule`)

- **Day tabs** across the top (one per event day).
- **View toggle**:
  - _Structured view_ — calendar/timeline layout, time-blocked, visually rich (this is the "hero" experience).
  - _Grid/List view_ — flat, scannable list grouped by time slot; better for screen readers, slow connections, and quick lookup. This toggle is explicitly there for **accessibility**, so make sure the list view is a first-class citizen, not an afterthought.
- **Filters**: by track, by room/stage (if multi-track).
- **Session card** fields: time, title, one-line description, speaker(s) (avatar + name, links to their modal), track tag (color-coded per DESIGN.md), room/location.
- **Add to calendar** action per session (Google/Apple/ICS).
- Empty/loading states should still carry the brand voice — e.g. "Schedule's still cooking — check back soon 👀" rather than a bare spinner.

---

## 4. Speakers Page (`/speakers`)

### 4.1 Grid

- All speakers, photo in morphed frame, name, role + company, small social icons.
- Search bar + filter by track/day.
- Consistent card sizing regardless of bio length (bio lives in the modal, not the card).

### 4.2 Speaker Modal (shared with Home preview)

- Opens on click, doesn't navigate away (URL can still update via query param/hash for shareability, e.g. `/speakers?spk=jane-doe`, without a full page load).
- Contains: full photo, name, role, company, full bio, session(s) they're speaking at (linking to `/schedule`), and social links (X, LinkedIn, personal site — only rendered if provided).
- Animation: modal should feel like it "grows" from the clicked card (shared-element transition, ease-out) rather than a generic fade-in — this is a nice macro-interaction moment.

---

## 5. FAQs Page (`/faqs`)

- Grouped accordions by category: **General**, **Tickets & Pricing**, **Venue & Logistics**, **Shop/Swag**, **Code of Conduct**.
- A small search input at the top filters questions live as you type.
- Each answer can link out where relevant (e.g. a pricing question links to `/tickets`, a conduct question links to the Community Guidelines).
- Keep answers short and conversational — this is a good place to let the playful voice show even while being genuinely useful.

---

## 6. Team Page (`/team`)

- Organizer photos (morphed frames), name, role/title (Lead Organizer, Design, Logistics, DevRel/Partnerships, Community, etc.) — grouped by sub-team if the org chart supports it, otherwise one grid.
- Short, personality-forward one-liners rather than formal bios — e.g. "Keeps the Wi-Fi (and the vibes) running."
- Social links per person, same treatment as speakers.
- Optional but valuable for a multi-year template: an **"Alumni / Past Organizers"** section lower on the page — reinforces the community-over-time story you're building the whole site around.

---

## 7. Tickets Page (`/tickets`)

Inspired by the Lagos flow (date/tier select → details → summary → payment), adapted for tiered, swag-bundled, named tickets.

**Step 1 — Choose your ticket**

- Tier cards laid out clearly (not crowded): **Haikyu** (free), **Sonnet** (basic paid), up through the top tier — each shows price, what's included (entry, swag items, perks), in the `mono-tag`-styled name treatment from DESIGN.md.
- Quantity selector per tier.

**Step 2 — Attendee details**

- If quantity > 1, collect details **per person** (name, email, and — for apparel-bearing tiers — T-shirt size). Clear indication of "Ticket 1 of 3," etc., so it doesn't feel like a wall of a form.

**Step 3 — Discount code**

- Optional field, applies before payment step, clearly shows the adjusted total.

**Step 4 — Payment**

- Mobile Money (MTN/Orange via Flutterwave or a Cameroon-focused gateway) as the lead option, card as secondary, per our earlier discussion.

**Step 5 — Confirmation**

- On-screen success state (a little celebratory animation — confetti burst, bouncy easing — this is a moment worth spending polish on).
- Email receipt + ticket confirmation, each ticket carrying a **QR/badge code** for check-in.

**Account & tracking**

- Login required (shared account system with Shop, per your decision) so people can return to a **"My Tickets"** dashboard — view/download tickets, resend confirmation email, see order history.
- Sticky order summary throughout steps 1–4 so the running total/what's-included is never out of sight.

---

## 8. Shop Page (`/shop`)

- **Standalone and evergreen** — live before, during, and after the event, independent of ticket sale windows.
- **Product grid**: big imagery (mockups get to shine here, per your note), each product shows a status pill: `Pre-order`, `In Stock`, `Available at venue only`, `Sold Out` — always paired with text, never color alone (DESIGN.md §2.6).
- Product detail: variant selection (size/color where applicable), quantity, add to cart.
- **Checkout reuses the Tickets payment layout/components** — same steps pattern (cart → details → discount code → payment → confirmation), same shared login/account.
- **Image protection**: disable right-click context menu and text/image selection via CSS (`user-select: none`, `pointer-events` tricks) and a `contextmenu` JS handler on product images. Worth setting expectations here — this deters casual copying but isn't a hard technical barrier (screenshots always remain possible); if stronger protection matters, a visible watermark on preview images is the more reliable option.
- **Order tracking**: "My Orders" in the shared account dashboard — status per item (processing, ready for pickup, shipped, etc.).

---

## 9. DP Generator (`/dp-generator` or standalone subdomain)

- Fully standalone, **no login**, no dependency on the rest of the site's auth or design system beyond sharing the brand look.
- Flow: enter a display name/nickname (no real-name requirement) → upload a photo → pick from a set of pre-made branded backgrounds/frames (using the morphed-shape motif) → position/crop → **download**.
- **Share to socials** button: prefilled caption + event hashtag + community handles, one tap to open the share sheet (or copy-to-clipboard fallback on desktop).
- No AI/Gemini integration, per your note — purely template + canvas compositing (e.g. HTML canvas or a lightweight image library), keeping it fast and dependency-light.

---

## 10. Shared Systems

### 10.1 Authentication

- **One account system shared between Tickets and Shop** (per your decision) — a person logs in once and sees both their tickets and their orders in a unified dashboard (e.g. `/account` with tabs for "Tickets" and "Orders").
- DP Generator and the main informational pages (Home, Schedule, Speakers, FAQs, Team) remain fully public, no auth needed.

### 10.2 Localization (French/English)

- Every route ships in both languages with a persistent switcher in the navbar (§1.1).
- Recommend **path-based locales** (`/fr/...`, `/en/...`) over query params — better for SEO, sharing, and clarity.
- Default language: worth deciding based on your actual audience split — Yaoundé skews Francophone, so defaulting to **French** with an easy switch to English (for international speakers/sponsors) is likely the safer default, but flag this as an assumption to confirm.
- Content that must be duplicated per language: nav labels, all page copy, ticket tier descriptions, FAQ content, email/receipt templates, DP Generator share captions.
- Content that can stay language-neutral: speaker/organizer names, session titles if the speaker submitted them in one language only (consider a small "original language" tag rather than force-translating), sponsor names/logos.

### 10.3 Voice & Microcopy

Carry the "friends who build things" tone into every small moment, not just headlines:

- Buttons: prefer active, warm phrasing ("Grab your ticket" over "Submit"; "Add to bag" over "Add to cart").
- Empty/error states: light, never sterile ("Nothing here yet — check back soon" rather than "No data available").
- Confirmation moments (ticket bought, order placed): genuinely celebratory, matches the bouncy animation energy from DESIGN.md.

---

## 11. Open Items / Assumptions to Confirm

- **Default language** (French vs English) — flagged in §10.2.
- **Ticket check-in method**: QR scanning app/tool needed at the door — worth planning alongside the ticket QR generation.
- **Discount code source of truth**: who issues/manages sponsor codes, and do they need their own lightweight admin view?
- **Shop fulfillment logistics**: pre-order cutoff dates, pickup-at-venue vs shipping, and how "post-event" sales get handled operationally (this affects the status-pill vocabulary in §8).
- **Team page grouping**: confirm actual sub-team structure (Design, Logistics, DevRel, Community, etc.) so the page reflects the real org chart.

---

_Pairs with DESIGN.md — that file defines how things look and move; this file defines what exists and what it says._
