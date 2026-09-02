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
- Mobile: collapses into a hamburger; the floating pill can morph into a rounded sheet that slides down — this transition is itself a fun **macro** animation moment (bouncy easing). The **current page is marked** in the mobile menu with a filled row (the day-toggle treatment) plus `aria-current="page"` (Phase 13 §7) — the desktop row marks it with its underline.
- **Easter egg idea:** clicking the logo rapidly (5–7 times) triggers a burst of halftone confetti shapes across the navbar, or briefly morphs the logo into a goofy alternate version for a second. Log this (and future ones) in `/EASTER-EGGS.md` per DESIGN.md §6.3.

### 1.2 Announcement Banner

- Sits above the navbar, dismissible (persists dismissal via localStorage/cookie for the session).
- **Marquee scroll** behavior for longer messages (e.g. "🎟️ Early bird tickets end in 3 days — grab yours before prices go up!"). The loop is **seamless** (Phase 12 §2) — see the note on the sponsor marquee below; the same rule applies here.
- Visually attaches to the navbar (shared rounded container or touching edge) so they read as one cohesive unit, not two competing bars.
- Used sparingly and only for genuinely time-sensitive updates — ticket deadlines, schedule changes, weather/venue alerts.

### 1.3 Footer (full, DevFest-Lagos-style)

- **Top:** ~~a wide community photo strip with an overlaid _"Be part of the story — RSVP now"_ CTA linking to Bevy.~~ **Superseded twice:** the photo+CTA block was dropped entirely (PHASE7 §7) for a mixed-layout full-page composition, and the RSVP framing was retired (`docs/decisions/0008-retire-bevy-rsvp.md`) for a ticket CTA.
- **Link groups**, clearly separated:
  - **Event**: Schedule, Speakers, Team, FAQs
  - **Get Involved**: Shop, DP Generator, Join the Community (Bevy) — _the RSVP item was removed, see `docs/decisions/0008-retire-bevy-rsvp.md`_
  - **Legal**: Privacy Policy, Community Guidelines/Code of Conduct
- **Follow us:** social icons (X, Instagram, LinkedIn, YouTube, Facebook, WhatsApp — whichever are active), Phosphor icons at 24px, each in the same circular treatment. WhatsApp added in Phase 11 §11.
- **Theme switcher:** four circles — Blue, Red, Yellow, Green — repainting the site live (DESIGN.md §2.5, ADR 0011).
- **The wordmark carries the click-scramble easter egg** (Phase 13 §6) — see `/EASTER-EGGS.md`.
- **Bottom line:** © [year] DevFest Yaoundé · GDG Yaoundé — small, quiet, Mono type.
- Background: can be the one place on the site that goes full Black 02 dark, for contrast and a strong "closing" feeling to the scroll.

---

## 2. Home Page (`/`)

> **Updated in Phase 11.** The home speaker cards show **basic info only** — name, role, company, short bio, socials. The icebreaker Q&A and the funny moment are deliberately NOT here: home is a teaser, and stacking all three made the preview card cluttered and forced it to scroll. The full personality lives on `/speakers`, where someone has actually asked for it. The home speaker slider also supports **drag/swipe**, matching the page slider's input handling.
>
> Hero spacing: the text block carries more padding, weighted vertical over horizontal, and the gap between the "DevFest" line and the stamped "Yaoundé ####" block below it is tightened so they nearly touch.
>
> **Phase 12 §5 fix:** the home slider's click-detail opens on **only the clicked card**, and clicking again dismisses it. It was appearing on every card at once — the panel had been moved outside the frame that clips it, so each card's closed (merely translated) panel was painting just below it.

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

> **Updated in Phase 10.** The schedule supports **parallel tracks**: sessions that start at the same time on the same day run against each other, and both views present a **timeslot** as a unit.
>
> - _Timeline view_ — one time marker per slot, with the concurrent sessions as **side-by-side columns** underneath it (stacked below `md`, where two cards abreast would be unreadable; each card names its own room anyway). A slot with one session renders exactly as before.
> - _List view_ — grouped **by timeslot**: a list of slots, each containing its own nested list of concurrent sessions. The nesting is the accessible statement of "these run at the same time"; a flat list would say only "these come one after another", which is wrong.
>
> **No new data field was needed.** `day` + `time` already identify a slot, and `room` already distinguishes the sessions inside it. A `slotId` would duplicate the times it derives from and could drift out of sync with them.
>
> Day tabs are **fully rounded in every state, including active**. The earlier folder-tab treatment squared off the active tab's bottom corners to join it to the board; DESIGN.md §5.2 forbids sharp corners anywhere, so active state is carried by fill and a small lift instead.

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

> **Updated in Phase 9, reworked in Phase 10.** `/speakers` offers **two views** — the grid below, and a **Slider view**. The slider is a **vertical cinema stage**: one person centred at full size, with the previous slide foreshadowed **above** and the next **below**, both scaled back and dimmed so the stack reads as depth. Drag has **momentum** — a slow drag past the threshold advances one slide, a flick carries two or three and decelerates into place. Buttons, arrow keys and Home/End all work; the index clamps at both ends rather than wrapping.
>
> Vertical drag is bound to **mouse and pen only**. On touch, a vertical gesture inside a tall stage is how you scroll the page, so claiming it would trap anyone who scrolled onto the slider; touch gets the buttons instead. Search and filters apply to both views and persist across the toggle, as does the focused speaker.
>
> **The slider is a FULL-SCREEN LOCKED TAKEOVER.** Switching to slider view covers the **entire** viewport — navbar included — and also requests the browser's Fullscreen API. Background scroll is frozen and the exact position restored on close; the overlay is dismissible by close button, Escape or click-outside, and dismissing leaves fullscreen and returns to grid view. The grid stays mounted underneath the whole time, so you come back to exactly the grid you left.
>
> There is **no container around the slides** — they sit directly on a dark, blurred scrim, so the whole screen goes to the content. (Flat wash over a blur; still no gradient.)
>
> This exists to solve a recurring problem at the root: through Phases 10–12 the stage lived in a page section and had to negotiate height with a heading, a filter row and a footer, which produced a new cropping or sizing complaint every phase. The lockup removes the negotiation.
>
> It is built on the shared `Modal` shell's `takeover` variant, not a second overlay system — see [ADR 0012](../decisions/0012-overlay-reuse.md).
>
> **Composition:** the slide fills roughly three quarters of the viewport height. The photo is a **polaroid** — thick lower border, tilted, alternating direction slide to slide — detached from the slide's edges, and sized generously but deliberately **not** filling its column. Prev/next slides **peek** past the active one on all four edges. The **counter and prev/next controls sit BELOW the slide** with **no chip or background behind the counter**. Every slide's content fits with **no scrollbar and no clipping at any screen size** (verified 1280×720 to 2560×1440; type, padding and the print all tighten on short viewports rather than the content being cut).
>
> **Available on mobile too.** It was desktop-only while the slider was an in-page section with no room on a phone; as a full-screen lockup it fits a phone at least as well as a desktop. The mobile composition is different, not a squeeze: a **single vertical column**, a **circle avatar** instead of the polaroid (it costs a fraction of the height, which is what leaves room for the whole detail), and the **controls overlaid at the bottom-right** with the counter beside them rather than stacked under the stage. Verified with no scrollbars from 360×640 up.
>
> Search and filters open from a **Filters button** into one of three surfaces, chosen by viewport — one shared pattern across `/speakers`, `/schedule`, `/team`, `/faqs` and `/shop` (`FilterLayout` + `FilterGroup`).
>
> **Updated in Phase 14 §1 — the margin rail is gone.**
>
> | Viewport                    | Surface                                               |
> | --------------------------- | ----------------------------------------------------- |
> | Laptop & desktop (>=1024px) | A panel that **slides in from the left** over a scrim |
> | Tablet (640-1023px)         | The bottom sheet, **width-capped and centred**        |
> | Mobile (<640px)             | The bottom sheet, full width                          |
>
> Phases 10-12 floated the rail in the page's left margin so the content column kept its full width. That needed ~1760px of viewport — a 14" laptop is ~1512px, so on the most common machine the filters did not render at all. A panel that opens on demand costs one click and works at every size. All three surfaces are the shared overlay components, so the focus trap, Escape, scrim dismissal and scroll lock have one implementation between them (ADR 0012).

### 4.1 Grid

- All speakers, photo in morphed frame, name, role + company, small social icons.
- Search bar + filter by track/day.
- Consistent card sizing regardless of bio length while closed.
- **Opening a card opens a POPOVER beside it** (Phase 11 §8, replacing Phase 10's in-place expansion): the card itself never changes size, so the grid does not reflow — no sibling jumps, no scroll position shifting under the pointer. The panel is one card wide, opens to the right, and flips to the left for cards in the last column so it always stays inside the grid.
- **Accordion: one card open at a time.** Opening another closes the previous one. Escape, a click outside, or the panel's own close button dismiss it.
- **The other cards dim while one is open** (Phase 12 §7), so the focused card is spotlit. It is opacity, not motion, so it still applies under reduced motion — only the easing is dropped.
- The popover's **close is animated**, symmetric with its open (Phase 13 §4) — it used to vanish instantly.
- **On mobile there is no side popover.** Tapping a card opens its detail in the **shared bottom sheet** — the same component as the filter drawer, so mobile has one sheet interaction rather than two ([ADR 0012](../decisions/0012-overlay-reuse.md)). The sheet has a blurred scrim, locks background scroll, and dismisses on tap-outside, Escape or swipe-down. Its header shows a **circle avatar rather than the name**, because the detail body already opens with the name.
- The grid is deliberately **plain** — it is the scannable view. The cinematic presentation is the slider.
- No hover underline on speaker names: with the card expanding on click, an extra hover animation on the name read as a link affordance the name doesn't have.

### 4.2 Speaker Modal (shared with Home preview)

- Opens on click, doesn't navigate away (URL can still update via query param/hash for shareability, e.g. `/speakers?spk=jane-doe`, without a full page load).
- Contains: full photo, name, role, company, full bio, session(s) they're speaking at (linking to `/schedule`), and social links (X, LinkedIn, personal site — only rendered if provided).
- Animation: modal should feel like it "grows" from the clicked card (shared-element transition, ease-out) rather than a generic fade-in — this is a nice macro-interaction moment.

---

## 5. FAQs Page (`/faqs`)

> **Updated in Phase 10, revised in Phase 14.** Search and the category list live in the **shared filter panel** (the same `FilterLayout` as `/speakers`, `/schedule`, `/team` and `/shop`) rather than in the content column, so they don't scroll away with the questions. The category list is a **scrollspy**: it highlights whichever group you're currently reading, and jumps to a group when clicked. On this page the panel's heading is "Jump to" rather than "Filters", since it is a search + nav rather than a filter set.

- Grouped accordions by category: **General**, **Tickets & Pricing**, **Venue & Logistics**, **Shop/Swag**, **Code of Conduct**.
- Search filters questions and answers live as you type; empty categories drop out entirely.
- **Each answer may carry an optional CTA** — `cta: { label, href, external? }` on the FAQ item. It is per-item, not per-category: the useful next step differs between two questions in the same category, and the old category-wide link appended "See tickets" to answers that had nothing to do with buying one. Items without a real next step render no button.
- The CTA is **block-level, on its own line below the answer** (Phase 11 §9) — never inline with the last line of the answer text, and that applies to plain text links too.
- Keep answers short and conversational — this is a good place to let the playful voice show even while being genuinely useful.

---

## 6. Team Page (`/team`)

> **Updated in Phase 9.** The team is grouped and filtered by a **`contribution`** field (Organising, Design, Logistics, Sponsoring, Ushering, Programme) rather than a sub-team org chart, which was never confirmed — see `docs/decisions/0010-team-grouping.md`. `/team` has the same **grid ↔ slider** views and the same floating-rail/bottom-drawer filter pattern as `/speakers` — including Phase 11's popover cards and the vertical cinema slider. It would be a divergent fork for the team grid to reflow while the speaker grid holds still.

> **Updated in Phase 11 §10:** the grid is **flat, ungrouped**, in any order. Grouping the grid by contribution produced mostly one-person sections, each costing a heading and a band of whitespace to say what the card underneath already said. Contribution is still stamped on every card and is still the filter axis — only the visual grouping is gone. Team members carry `contribution`, `icebreakerQuestion`, `icebreakerAnswer` and an optional `funnyMoment`. Alumni sit outside the filtered set in their own section.

- Organizer photos (morphed frames), name, role/title (Lead Organizer, Design, Logistics, DevRel/Partnerships, Community, etc.) — grouped by sub-team if the org chart supports it, otherwise one grid.
- Short, personality-forward one-liners rather than formal bios — e.g. "Keeps the Wi-Fi (and the vibes) running."
- Social links per person, same treatment as speakers.
- Optional but valuable for a multi-year template: an **"Alumni / Past Organizers"** section lower on the page — reinforces the community-over-time story you're building the whole site around.

---

## 7. Tickets Page (`/tickets`)

> **Built in Phase 14** against the real backend. See
> `docs/guides/frontend-integration.md` for the contract and
> `docs/backend/GAPS.md` for what is wired versus pending.

### 7.1 The tiers

Currency is **XAF (FCFA)**. Data lives in `src/data/ticket-tiers.json`.

| Tier       | Label          | Price  | Sold here?            |
| ---------- | -------------- | ------ | --------------------- |
| **HAIKYU** | Free pass      | 0      | **No — RSVP on Bevy** |
| **SONNET** | Student pass   | 2,000  | yes                   |
| **OPUS**   | —              | 5,000  | yes                   |
| **FABLE**  | —              | 10,000 | yes                   |
| **MYTHOS** | Legendary pass | 25,000 | yes                   |

**The free tier is not sold on this site.** Selecting it links out to the
community platform, which already enforces one free RSVP per person — so it
has no quantity selector, never enters the basket, and never touches sign-in
or payment. This is not a contradiction of the retired Bevy RSVP CTA
(`docs/decisions/0008`): that was about the generic hero call to action. Paid
ticketing is on-site; free RSVP is delegated.

Every tier lists its **swag** as a row of small cutout-style prints —
alternating tilt, hover lifts one and names it. Higher tiers show more. Images
are placeholders; the names are real.

### 7.2 Checkout — three steps

**Choose → Who's coming → Payment.** The order summary is sticky throughout.

- **Choose** — quantity per paid tier, capped at 10 per order (the server's own
  limit).
- **Who's coming** — one entry per ticket, headed "Ticket N of M". Name and
  email are required; **phone is collected but optional** (see below). A
  **t-shirt size** is required on tiers that include apparel and enforced
  before Continue. Each ticket can be marked **"this one's mine"**, which
  prefills from the signed-in account and stays editable.
- **Payment** — **Mobile Money only.** No card option is rendered at all: the
  integration does not support cards, and a disabled control would read as a
  bug rather than a decision. Card support would need a separate processor for
  diaspora buyers — a future decision.

**Sign-in is offered at the start and is optional**, purely to prefill details.
It becomes required only at payment. Google is the only provider (ADR 0014).

**The discount code is not a step.** It lives in the order summary as an
"add a discount code" link that reveals a field with an Apply button. There is
deliberately **no pre-validation endpoint** — one would be a free oracle for
guessing codes — so Apply stages the code and the server's verdict arrives with
the order. The copy says exactly that.

### 7.3 Refunds — stated, and gated

**Tickets are non-refundable and non-cancellable once paid.** A paid ticket can
be **transferred** to another name before the day.

Stated in body-sized text on the payment step, behind a **required
acknowledgment checkbox that gates the pay button**, and again in the FAQ.
Never small print. Full policy in `docs/content/refund-policy.md`.

### 7.4 After paying

`/{locale}/payments/return` is the confirmation screen — the route the backend
sends every buyer to. It polls the status endpoint, which is what actually
**issues the ticket** (settlement is by polling, ADR 0019). On success it shows
confetti, the amount charged, and each **badge code as a scannable QR beside
the readable code** — both, always, because a dead battery still has to get
someone in (ADR 0020).

### 7.5 Account

`/{locale}/account` — **My Tickets** (badge QR + code, tier, check-in state)
and **My Orders**, shared with the shop. Both are scoped to the signed-in
person by the database itself.

## 8. Shop Page (`/shop`)

> **Built in Phase 14 Part B** against the real backend. Contract in
> `docs/guides/frontend-integration.md`; what is wired versus pending in
> `docs/backend/GAPS.md`.

**Evergreen.** The shop runs before, during and after the event — no copy
assumes the event is still upcoming.

### 8.1 Catalog (`/shop`)

Products come from `src/data/products.json`, which is also what the server
prices against by id, so display and charge cannot drift.

Every card carries a **status pill — text + Phosphor icon + colour, never
colour alone** (DESIGN.md §2.6):

| `status`     | Pill         | Buyable |
| ------------ | ------------ | ------- |
| `in-stock`   | In stock     | yes     |
| `pre-order`  | Pre-order    | yes     |
| `venue-only` | At the venue | **no**  |
| `sold-out`   | Sold out     | **no**  |

The last two are enforced server-side too, so a stale tab cannot buy them.

**Filtering is by availability and search, not category** — the product model
has no `category` field, and inventing one client-side would filter on data the
server does not have (GAPS.md G11). It uses the **shared filter component**, so
`/shop` gets the same four surfaces as the content pages: margin rail on very
large screens, floating push panel on laptops, capped sheet on tablet,
full-width sheet on mobile.

### 8.2 Product — a right-hand drawer (`/shop/[product]`)

Detail opens as a **drawer sliding in from the right** over the grid, with a
scrim and the background scroll locked, dismissed by Escape, the close button
or the scrim. Large imagery, variant selection, quantity and add-to-bag all
live inside it. Clicking a card never navigates: the grid, its filters and its
scroll position stay exactly where they were, which is the whole point.

**It is still deep-linkable, and products keep their own URLs.** Opening a
card pushes `/shop/{id}`; arriving at that URL directly renders the grid with
the drawer already open; Back closes the drawer rather than leaving the page.

**On SEO — the call made here.** A drawer alone would have cost every product
its URL, and with it sharing, bookmarking and indexing, so the route stayed.
Each product URL carries its own title, description, OpenGraph image and
`Product` JSON-LD (name, description, price, availability), and the grid
server-renders every product's name, description and price in the cards. What
is _not_ in the server HTML is the drawer's own body — it is portalled, so it
mounts in the browser. The indexable payload is therefore metadata plus
structured data rather than drawer markup, which for a product page is the part
search engines actually read. If rich-result coverage ever falls short, the fix
is to server-render the detail beneath the drawer — not to abandon the drawer.

**Availability is per PRODUCT, not per variant** — the catalog has one status
per product and no per-variant stock (GAPS.md G12). Rather than greying out
individual sizes on a guess, an unbuyable product disables the whole control
set and says why. A sized product will not add to the bag until a size is
chosen, because the server rejects it otherwise.

**Image protection** — no context menu, no dragging, no selection, confined to
product imagery. It is a **soft deterrent and nothing more**: the file is still
in the network tab and a screenshot takes one keystroke. §8 already settles
this; the documented stronger option is a watermark.

### 8.3 Bag and checkout (`/shop/cart`)

**This is the ticket checkout**, not a second one. The step chrome, the sticky
order summary with its inline discount field, and the whole payment step —
Mobile Money only, the phone field, the refund acknowledgment that gates the
pay button — are shared components under `src/components/checkout/`. What
differs is genuinely different: line items are products with variants rather
than attendees with names.

Fewer steps than tickets (**Your bag → Payment**), deliberately: a bag needs no
per-person details.

- **The bag is device-local.** There is no server cart — checkout posts the
  whole basket in one request — so it lives in `localStorage`, survives reload,
  syncs between tabs, and does not follow you to another device (GAPS.md G15).
- **Fulfilment is stated, not asked.** A pickup-vs-delivery control was built
  and then removed: the shop checkout schema has no fulfilment field, so the
  choice was collected and discarded, and a control that changes nothing is
  worse than no control. In its place, an honest line — the team coordinates
  pickup or delivery after checkout (G13).
- **Goods have their own return policy**, distinct from tickets: no refund for
  a change of mind, but replacement for damaged, faulty or wrong items, and
  size exchange on apparel while stock lasts, handled directly with the team.
  The acknowledgment gate is the same shared component; only the wording
  differs. See `docs/content/refund-policy.md`.

### 8.4 Orders

`/account` → **My Orders**, shared with tickets: real status
(`processing` / `ready_for_pickup` / `shipped` / `delivered` / `cancelled`),
line items, and totals. Items use the order's `name_snapshot`, not a catalog
lookup, so a past order still reads correctly after the catalog changes.

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
