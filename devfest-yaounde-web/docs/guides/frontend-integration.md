# Building the Tickets, Shop and DP Generator screens

Everything behind these three pages is built and tested. This is what it looks
like from the outside, so the screens can be written without reading the
backend.

Three rules that shape every flow below:

1. **Never send a price.** Totals are recomputed server-side from
   `src/data/*.json` by id. A `priceXAF` in a request body is ignored. Show
   prices from the same JSON files, but the charge comes from the server.
2. **Never treat the return from the payment page as proof of payment.** The
   tab can be closed, or reopened by someone else. Poll the status endpoint.
3. **Errors come back as a `code`, never as a sentence.** Map it through
   `errors.checkout.*` in `messages/{fr,en}.json`, which already has both
   languages for every code.

Failure shape, everywhere:

```json
{ "error": "tier_sold_out", "retryAfter": 300 }
```

`retryAfter` only appears on `429`.

---

## Signing in

Google only. Nothing else is enabled, and nothing in the UI should offer
anything else.

```ts
import { createClientSupabase } from "@/lib/supabase/client";

const supabase = createClientSupabase();
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    // Locale rides in the query string: /auth/callback lives outside
    // [locale] because the redirect URI is registered once with Google.
    redirectTo: `${location.origin}/auth/callback?locale=${locale}&next=/${locale}/tickets`,
  },
});
```

`next` must be a path on this site. An absolute URL is discarded server-side,
so an open-redirect cannot be smuggled through it.

Signing out is a **POST** (a GET sign-out is triggerable by any `<img>` on
another site):

```ts
await fetch(`/auth/signout?locale=${locale}`, { method: "POST" });
```

**Who is signed in** — one call, also tells you whether to show the organiser
tools:

```
GET /api/account/profile
→ { id, email, displayName, avatarUrl, isOrganiser }
→ 401 { error: "unauthenticated" }  // not signed in
```

---

## Tickets — the five steps

`PAGES.md` §7 describes five steps. Steps 1–3 are pure UI: no request is made
until the person confirms. Everything is one call.

### Steps 1–3, in the browser only

- **Tier + quantity** — read `src/data/ticket-tiers.json`. Show only
  `onSale: true`. `priceXAF: 0` is the free tier.
- **Attendee details** — one entry per ticket. **The list is the quantity**:
  three Sonnet attendees means three Sonnet tickets. If the tier has
  `includesApparel: true`, a size is required or the server rejects the order.
- **Discount code** — optional, sent with the checkout. There is no "validate
  code" endpoint on purpose: a separate endpoint would be a free oracle for
  guessing codes.

### Step 4 — one call

```
POST /api/checkout/tickets
```

```json
{
  "attendees": [
    {
      "tierId": "sonnet",
      "name": "Ada Nkeng",
      "email": "ada@example.com",
      "apparelSize": "M"
    }
  ],
  "discountCode": "GDG-2026",
  "contact": { "email": "ada@example.com", "phone": "237690000000" },
  "locale": "fr"
}
```

`contact.phone` is optional and must be `237XXXXXXXXX` — no `+`, no spaces. If
you send it, the PawaPay page is pre-filled; if not, it asks.

**Success:**

```json
{
  "depositId": "…uuid…",
  "redirectUrl": "https://paymentpage.pawapay.io/…",
  "fulfilled": false,
  "charged": 10000,
  "currency": "XAF",
  "quote": { "lines": [...], "subtotal": 10000, "discountAmount": 0, "charged": 10000 }
}
```

Two branches, and the free one is easy to miss:

| Response                                | What to do                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `fulfilled: false` + `redirectUrl`      | `location.href = redirectUrl`                                                  |
| `fulfilled: true`, **no** `redirectUrl` | Free tier. The ticket already exists — go straight to the confirmation screen. |

A 0 XAF basket never touches PawaPay: it cannot process a zero deposit, and
the ticket that comes out is identical to a paid one at the door.

Use `quote` to show the final breakdown — it is what was actually charged,
including the discount the server applied.

**Failures worth their own message:**

| Code                                    | HTTP | Means                                              |
| --------------------------------------- | ---- | -------------------------------------------------- |
| `unauthenticated`                       | 401  | Send them to sign in, keep the basket              |
| `tier_sold_out`                         | 409  | Someone took the last seats while they were typing |
| `discount_exhausted`                    | 409  | Code already fully used                            |
| `discount_expired` / `discount_invalid` | 400  | Keep the basket, clear the code field              |
| `apparel_size_required`                 | 400  | A size is missing — highlight the attendee         |
| `rate_limited`                          | 429  | Show `retryAfter` seconds                          |
| `payment_page_failed`                   | 502  | PawaPay refused; nothing was charged, offer retry  |

`tier_sold_out` at this point is real: capacity is reserved here, not at step
1, so a tier can go from available to full between rendering the card and
confirming. That is worth a clear message rather than a generic error.

### Step 5 — the return page

Route: `/{locale}/payments/return?depositId=…` — **this page does not exist
yet and needs building.** It is where PawaPay sends people back.

It is a waiting room. Poll:

```
GET /api/payments/status?depositId=…
```

```json
{
  "status": "pending",
  "providerStatus": "ACCEPTED",
  "charged": 10000,
  "currency": "XAF",
  "kind": "tickets"
}
```

| `status`          | Meaning                               | Screen                                                          |
| ----------------- | ------------------------------------- | --------------------------------------------------------------- |
| `pending`         | Not settled yet                       | Keep waiting. `providerStatus` is PawaPay's own word for it     |
| `activated`       | Paid, verified, tickets issued        | Confetti. This is the celebratory moment `PAGES.md` §7 asks for |
| `failed`          | Terminal failure                      | Nothing was charged; offer to try again                         |
| `amount_mismatch` | Paid, but not the expected amount     | Rare. Say the team is looking into it — do not offer a retry    |
| `404 not_found`   | Not their deposit, or no such deposit |                                                                 |

Poll every 3–5 seconds, and stop after about two minutes with a "we'll email
you" message.

**This page is the primary settlement path** (ADR 0019), so the poll is doing
real work, not just watching: it is what issues the tickets. Closing the tab
early is still safe — a sweep runs every five minutes and settles anything
left — but keeping it open is what makes confirmation feel instant.

Copy for all four states is in `errors.payment.*`, both languages.

---

## Shop

Identical shape to tickets, which is deliberate — `PAGES.md` §8 asks the shop
to reuse the ticket checkout pattern, so it reuses the code too.

Read `src/data/products.json`. `status` drives both the pill and whether it can
be bought:

| `status`     | Pill         | Buyable |
| ------------ | ------------ | ------- |
| `pre-order`  | Pre-order    | yes     |
| `in-stock`   | In stock     | yes     |
| `venue-only` | At the venue | **no**  |
| `sold-out`   | Sold out     | **no**  |

Always pair the pill with text, never colour alone (DESIGN.md §2.6). The last
two are enforced server-side, so a stale tab cannot buy a sold-out item.

```
POST /api/checkout/shop
```

```json
{
  "cart": [
    {
      "productId": "tee-edition",
      "quantity": 2,
      "variant": { "size": "M", "color": "Noir" }
    }
  ],
  "contact": { "email": "ada@example.com" },
  "locale": "fr"
}
```

**If a product lists sizes, a size is required.** `invalid_variant` comes back
otherwise. Max 10 per line, 20 lines.

Response and polling are exactly as for tickets, with `kind: "shop"`.

Image protection (right-click and selection disabled) is a **soft deterrent
only** — `PAGES.md` §8 already settles this. Do not re-litigate it as if it
were a real barrier; a watermark is the documented stronger option.

---

## Account dashboard

```
GET /api/account/tickets
→ { "tickets": [ { id, tier_id, attendee_name, attendee_email,
                   apparel_size, badge_code, checked_in_at, created_at } ] }

GET /api/account/orders
→ { "orders": [ { id, status, total_amount, currency, fulfilment, created_at,
                  order_items: [ { product_id, variant, quantity,
                                   unit_amount, name_snapshot } ] } ] }
```

Both are already scoped to the signed-in person by the database itself. There
is no id to pass, and no way to ask for someone else's.

`badge_code` is what becomes the QR at the door — format `DFY-XXXXX-XXXXX`.
Render it as a QR **and** as readable text: a cracked screen or a dead battery
still has to get someone in.

`name_snapshot` is the product name as it was when the order was placed, so a
past order keeps reading correctly after the catalog changes. Use it, not a
lookup in `products.json`.

---

## DP Generator

No login, no server, no upload. The photo never leaves the device, which is
why there is no upload endpoint to call (ADR 0015).

```ts
import {
  loadPhoto,
  renderDp,
  composeDp,
  dpFileName,
  DP_SIZE,
} from "@/lib/dp/compose";
import { DP_FRAMES, DEFAULT_FRAME_ID } from "@/lib/dp/frames";
import { shareDp, downloadDp } from "@/lib/dp/share";

// 1. nickname — free text, no real-name requirement, 28 chars shown
// 2. photo
const photo = await loadPhoto(file); // throws DpImageError

// 3. frame — DP_FRAMES has id, label {fr,en}, and its colours
// 4. position: live preview into an on-screen canvas, cheap enough for a drag
renderDp(canvasEl, {
  photo,
  frameId,
  nickname,
  transform: { scale, offsetX, offsetY },
});

// 5. download / share
const blob = await composeDp({ photo, frameId, nickname, transform });
downloadDp(blob, dpFileName(nickname));

const outcome = await shareDp({ blob, fileName, locale, eventUrl });
// "shared" | "copied" | "unavailable" → errors.dp.* has copy for each
```

`transform`: `scale` 1 = fits the frame, higher zooms; `offsetX/offsetY` are
fractions of the frame size from centre. Use `renderDp` while dragging and
`composeDp` only on download — the second one produces a Blob and is wasteful
per pointer move.

`loadPhoto` throws `DpImageError` with `code` in `unsupported_type`,
`too_large` (12 MB), `unreadable` — copy in `errors.dp.*`.

On the frames: `PAGES.md` §9 mentions the morphed-shape motif, but DESIGN.md
§4.2 forbids faking it until the real asset exists. The frames use clean
rounded rectangles and circles. Do not hand-roll a morph.

---

## Organiser tools

Both need a row in the `organisers` table — see
`docs/guides/check-in-and-orders.md`. Gate the UI on
`profile.isOrganiser`, but note the server checks independently: hiding a
button is not access control.

```
POST /api/check-in           { badgeCode }
PATCH /api/orders/:id/status { status, fulfilment? }
```

---

## What still needs building

| Screen              | Route                       | Notes                                                                                       |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| Ticket checkout     | `/{locale}/tickets`         | 5 steps, sticky order summary through 1–4                                                   |
| Payment return      | `/{locale}/payments/return` | **Referenced by the backend, does not exist.** Without it people land on a 404 after paying |
| Shop grid + product | `/{locale}/shop`            |                                                                                             |
| Shop checkout       | `/{locale}/shop/checkout`   | reuse the ticket step components                                                            |
| Account             | `/{locale}/account`         | Tickets / Orders tabs                                                                       |
| DP generator        | `/{locale}/dp-generator`    |                                                                                             |
| Check-in scanner    | organiser-only              | camera → `POST /api/check-in`                                                               |
| Order back office   | organiser-only              |                                                                                             |

Every one of these must exist under **both** `/fr` and `/en` in the same
change — the i18n rule is not a follow-up task.

The payment return page is the urgent one: it is the only route the backend
sends people to that has no page behind it.
