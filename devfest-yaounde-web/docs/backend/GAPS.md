# Backend ⇄ UI map: what can be wired for real, and what cannot

**As of 2026-08-31, `6be72fc`.** Companion to `docs/backend/OVERVIEW.md`.

This is the map that decides, screen by screen, whether Phase 14 wires a flow
to the real backend or marks it pending. The rule it enforces:

> **Where the backend supports a flow, wire it for real. Where it does not,
> build the UI, mark it visibly pending, and record it here — never fake a
> success as if it happened.**

A faked confirmation is worse than a missing one. Someone who believes they
hold a ticket and does not is a problem at the door, not on the screen.

---

## Summary

| Flow                        | Backend                   | Phase 14 does                    |
| --------------------------- | ------------------------- | -------------------------------- |
| Ticket tiers → checkout     | **Complete**              | Wire for real                    |
| Free-tier checkout          | **Complete**              | Wire for real                    |
| Mobile Money payment        | **Complete**              | Wire for real                    |
| Payment settlement + QR     | **Complete**              | Wire for real                    |
| Google sign-in              | **Complete**              | Wire for real                    |
| Account: tickets & orders   | **Complete**              | Wire for real                    |
| Shop catalog → checkout     | **Complete**              | Wire for real                    |
| DP generator                | **Complete**              | Wire for real (no server at all) |
| **Card payment**            | **Absent**                | Not offered — see G1             |
| **Refunds / cancellation**  | **Absent**                | Not offered — see G2             |
| **Email receipts**          | Code done, provider unset | Wire; degrades silently — G3     |
| **Discount code preview**   | Deliberately absent       | No "check code" button — G4      |
| Organiser check-in / orders | **Complete**              | Out of Phase 14's scope — G5     |

**Most of this is buildable for real.** The gaps are narrow and specific.

---

## The gaps

### G1 — Card payments do not exist

`PAGES.md` §7 asks for card as a secondary option. The integration is Mobile
Money only, and whether PawaPay covers cards or a second gateway is needed
**has not been investigated** (`remaining-work.md` §2).

**DECIDED 2026-09-02:** Mobile Money only. **No card option is rendered at
all** — not even disabled. A greyed-out button that never works reads as a bug
on someone's phone rather than a decision.

Card support would need a separate processor aimed at diaspora buyers. That is
a future decision, explicitly not this phase.

### G2 — No refunds or cancellation

<!-- Deferred 2026-09-02 to a future phase. -->

Cancelling an order moves no money; refunds are manual in the PawaPay
dashboard, and `amount_mismatch` needs a human either way.

**Phase 14 does:** no cancel/refund control in `/account`. Orders are
read-only. The `amount_mismatch` state gets copy that says the team is looking
into it and **does not offer a retry** — the guide is explicit that retrying is
wrong there.

### G3 — Email provider not chosen

Templates and dispatch are written and bilingual; Resend is wired as the one
adapter. **Without `RESEND_API_KEY` nothing sends** — the payment still
completes, the ticket still exists, and `payment_events` records
`receipt_skipped`.

**DECIDED 2026-09-02:** don't promise an email that cannot send. The on-screen
QR and badge code are the source of truth; email is mentioned **only** when
`RESEND_API_KEY` is actually configured. The badge code also lives in
`/account`, so the ticket is reachable either way. This is a config gap, not a
code gap.

### G4 — No discount-code validation endpoint, on purpose

<!-- Confirmed 2026-09-02: apply at submission, reflect the server's verdict. -->

There is deliberately no "check this code" endpoint: it would be a free oracle
for guessing codes.

**Phase 14 does:** the code field submits with the order; an invalid or spent
code comes back as `discount_invalid` / `discount_expired` /
`discount_exhausted` and clears the field while **keeping the basket**. No
live-validation affordance that implies checking-as-you-type.

### G5 — Organiser tools are unbuilt (backend ready)

<!-- Deferred 2026-09-02 to a future phase. -->

`POST /api/check-in` and `PATCH /api/orders/:id/status` both work and are
access-controlled server-side. The scanner and back-office **screens** do not
exist.

**Phase 14 does:** nothing — they are outside the three parts. `isOrganiser`
comes back from `/api/account/profile` if a later phase wants them. Also note
`remaining-work.md`: **check-in requires a connection**; an unreliable venue
network needs planning before the day.

### G6 — QR rendering — RESOLVED

The badge code is issued and shown; **the QR image is not drawn**, because
every reasonable way to draw one needs a call this phase cannot make alone:
a library (an ADR and a go-ahead), a hand-rolled encoder (several hundred
lines of Reed-Solomon, wrong-but-plausible output discovered at the door), or
an external service (which would send the credential to a third party).

**Phase 14 does:** renders the badge code as large, selectable text on the
confirmation screen and in `/account`. That is required regardless — a cracked
screen still has to get someone in — so what is missing is the convenience of
scanning, not the ability to enter.

**RESOLVED 2026-09-02.** [ADR 0020](../decisions/0020-qr-rendering.md)
approved; `qrcode` renders the badge client-side, with the readable code kept
alongside it.

### G7 — No per-attendee phone; email is mandatory server-side

The brief asked for "phone AND/OR email, at least one" per attendee. The server
does not allow it: `attendeeSchema` **requires** `email` and has **no phone
field at all**. Only the order-level `contact.phone` exists, and it is used
solely to pre-fill the PawaPay page.

**Phase 14 does:** requires the email (as the server does), and collects an
optional phone per attendee for the buyer's own record — clearly labelled
optional, and **not sent**, because there is nowhere to put it.

**Needs a decision:** if identifying an attendee by phone alone matters, that
is a schema change — `attendeeSchema`, the `tickets` table, and the email
dispatch that currently assumes an address.

### G8 — "This one's mine" is not a server field

Self-assignment drives **prefill only**. Nothing records which ticket belongs
to the buyer, so `/account` cannot distinguish "my ticket" from "a ticket I
bought for someone".

**Phase 14 does:** uses it to prefill name and email from the signed-in
profile, and says nothing about ownership it cannot back up.

### G9 — The non-refundable acknowledgment is not enforced server-side

The checkbox gates the pay button in the browser. There is no field for it in
`ticketCheckoutSchema`, so a request posted directly to the API succeeds
without it.

**Phase 14 does:** ships the gate, because it is the right UI. It does not
pretend the consent is recorded.

**Needs a decision:** whether the acknowledgment must be evidence (a stored
`accepted_terms_at`) or is only an interface affordance. See
`docs/content/refund-policy.md`.

### G10 — The Bevy URL — RESOLVED

The free tier now sends people off-site to RSVP, and `BEVY_URL` in
`src/lib/site-config.ts` is `"#"`. **The free-pass CTA currently links
nowhere.**

**RESOLVED 2026-09-02.** `BEVY_URL` now points at the chapter's event page,
and the free-pass CTA was verified to reach it in both locales.

### G11 — Products have no `category` field

The brief asked for a category filter. `Product` carries `id`, `name`,
`description`, `priceXAF`, `images`, `variants` and `status` — **no category**,
and nothing server-side groups products.

**Part B does:** filters on **`status`**, which is real and is what actually
changes what someone can do, plus a search across name and description.
Inventing categories client-side would mean filtering on data the server does
not have, and they would drift the moment the catalog is edited.

**ACCEPTED 2026-09-02.** Availability + search is the filter. Categories are a
backend item, left documented.

### G12 — No per-variant inventory

The brief asked for out-of-stock variants to be individually disabled. The
catalog has **one `status` per product** and no per-variant stock, so there is
nothing to disable a single size against.

**Part B does:** shows and enforces availability at the PRODUCT level. When a
product is unbuyable the whole control set is disabled and says why, which is
the truthful version of the same intent. It does not grey out individual sizes
on a guess.

**ACCEPTED 2026-09-02.** Product-level enforcement stands. Per-variant stock is
handed off: it is a schema change — a per-variant row, and checkout validation
against it.

### G13 — Fulfilment cannot be chosen by the buyer

Orders **do** carry a `fulfilment` column — free-form JSON with
`method: "pickup" | "shipping"`, a note and a reference. But it is written
**only by organisers**, through `PATCH /api/orders/:id/status`.
`shopCheckoutSchema` has no fulfilment field, so a buyer's choice has nowhere
to go.

**DECIDED 2026-09-02:** the interactive choice was **removed**. A
pickup-vs-delivery control that sends nothing is a fake control — it invites a
decision and then discards it, which is worse than not asking. In its place is
an honest line: the team coordinates pickup or delivery after checkout.

**Handed off:** buyer-settable fulfilment is a backend item — add `fulfilment`
to `shopCheckoutSchema` and carry it onto the order. Logistics (zones, fees,
pickup windows) are open anyway (`PAGES.md` §11).

### G14 — Shop return policy — RESOLVED (consent persistence folded into G9)

**DECIDED 2026-09-02:** goods get their **own** terms — no refund for a change
of mind, but replacement for damaged, faulty or wrong items, and size exchange
on apparel while stock lasts. Exchanges are handled manually, off-platform.
Copy, FAQ and the shop's acknowledgment wording all say this;
`docs/content/refund-policy.md` records it as settled.

No backend was needed, and none was written: this is a policy someone honours,
not a feature.

What remains is **not** a shop-specific gap — the acknowledgment is a
client-side gate with no server record for tickets and goods alike. That is
**G9**, and it stays a backend-phase item.

### G15 — The bag is device-local

There is no cart on the server: `POST /api/checkout/shop` takes the whole
basket in one request. The bag therefore lives in `localStorage`.

**ACCEPTED 2026-09-02.** `localStorage` stands; a server cart is a
low-priority backend item.

It persists across navigation and reload on that device, and syncs between
tabs. A bag started on a phone does not appear on a laptop, and clearing site
data empties it — so nothing in the UI calls it "saved to your account", and
nothing should start.

### G16 — The share caption has no community handles

`PAGES.md` §9 asks the share caption to carry "prefilled caption + event
hashtag + community handles". Two of the three exist in `src/lib/dp/share.ts`:
the caption and `SHARE_HASHTAGS`. **The handles do not**, and none were
invented — every entry in `SOCIAL_LINKS` (`src/lib/site-config.ts`) is still
`"#"`, so there is no confirmed `@name` on any network to put in a caption
that thousands of people would post.

**OPEN — content, not code.** Once the real profiles are known, add them to
`SHARE_CAPTIONS` or alongside `SHARE_HASHTAGS` in `share.ts`; the caption is
built in one place and shown on screen exactly as it is sent, so the change is
a one-liner and is immediately visible.

Guessing was the alternative and it was rejected: a wrong handle in a share
caption tags a stranger, and it does it on every post.

### G17 — The DP frames are placeholder colours, not the morphed motif

`PAGES.md` §9 asks for the morphed-shape motif on the frames. `DpMask` offers
`rounded` and `circle` only, per ADR 0015 and the standing instruction in
`DESIGN.md` §4.2 not to approximate the signature shape until the real asset
exists.

**OPEN — asset, not code.** The five frames are honest, on-brand colour
schemes. When the shape asset arrives, `DpMask` and `clipToMask` in
`compose.ts` are the two places that change, and the UI needs no edit: the
picker renders whatever `DP_FRAMES` contains and the swatch already draws each
frame's mask shape.

---

## Content, not code

Every ticket tier and product is **invented placeholder data** — `HAIKYU`,
`SONNET`, `OPUS`, their prices and their perks. Shape comes from `PAGES.md`
§7; the values do not come from anyone.

**Phase 14 does:** builds against the real files and their real shape, and does
not dress the numbers up as confirmed. Replacing them is
`docs/guides/updating-tickets-and-shop.md`, and it must happen before a real
sale (`remaining-work.md` §1, item 8).

---

## Config that blocks a real sale

None of this is code, all of it fails quietly, and **none of it is Phase 14's
to do** — it is listed so the UI work is not mistaken for readiness. Full table
in `docs/setup/remaining-work.md` §1.

The two that bite hardest:

- **`BADGE_CODE_SECRET` must be set and never change.** Every badge code
  derives from it, so rotating it invalidates every ticket already sold.
- **The AWS relay must point at this app.** Otherwise payments succeed, money
  leaves accounts, and nobody gets a ticket — with no error anywhere.

Settlement now happens primarily by **polling** (ADR 0019), so the payment
return page carries real weight: it is what issues the ticket while the buyer
watches. A five-minute sweep catches anyone who closed the tab.

---

## The one thing the backend points at that does not exist

**`/{locale}/payments/return`.** PawaPay sends every buyer there after paying,
and there is no page behind it — today they land on a **404 holding a completed
payment**.

This is the highest-priority screen in Part A, ahead of the tier cards.
