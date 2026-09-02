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

### G6 — QR rendering needs a dependency decision

The badge code is issued and shown; **the QR image is not drawn**, because
every reasonable way to draw one needs a call this phase cannot make alone:
a library (an ADR and a go-ahead), a hand-rolled encoder (several hundred
lines of Reed-Solomon, wrong-but-plausible output discovered at the door), or
an external service (which would send the credential to a third party).

**Phase 14 does:** renders the badge code as large, selectable text on the
confirmation screen and in `/account`. That is required regardless — a cracked
screen still has to get someone in — so what is missing is the convenience of
scanning, not the ability to enter.

**Needs a decision:** [ADR 0020](../decisions/0020-qr-rendering.md), which
recommends the `qrcode` library.

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

### G10 — The Bevy URL is still a placeholder

The free tier now sends people off-site to RSVP, and `BEVY_URL` in
`src/lib/site-config.ts` is `"#"`. **The free-pass CTA currently links
nowhere.**

**Phase 14 does:** builds the flow and points it at the constant. This is a
one-line config fix, but it is on the critical path for the cheapest way into
the event — a blocker, not a nicety.

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
