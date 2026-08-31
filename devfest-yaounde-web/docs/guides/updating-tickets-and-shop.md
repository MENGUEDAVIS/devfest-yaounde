# Updating ticket tiers and shop products

Prices, tiers and merch live in two JSON files. Editing them needs no
developer — same rules as `updating-content.md`:

1. **Both languages, always.** Any field written as `{ "fr": "…", "en": "…" }`
   needs both filled in.
2. **`id` must be unique** and shouldn't change once anyone has bought it —
   past tickets and orders reference it.

> ## ⚠ Everything in these two files is mock data
>
> The tier names (`HAIKYU`, `SONNET`, `OPUS`), the prices, the perks, the
> products and their images are all **invented placeholders**. They exist so
> the checkout, the capacity limits and the receipts could be built and tested
> against something concrete.
>
> Only the tier _shape_ comes from `PAGES.md` §7 — a free tier, a paid tier, a
> top tier. The names and the contents are not decided.
>
> **Nothing here may go live as-is.** Replace it before sales open; the
> pre-launch checklist in `docs/setup/deployment.md` lists it as a blocker.
> Changing a name or a price is a file edit and needs no developer — the
> sections below say how.

---

## Ticket tiers — `src/data/ticket-tiers.json`

```json
{
  "id": "sonnet",
  "name": "SONNET",
  "priceXAF": 10000,
  "onSale": true,
  "includesApparel": true,
  "quantityAvailable": 150,
  "description": {
    "fr": "Une ou deux phrases sur ce que contient ce billet.",
    "en": "A sentence or two about what this ticket gets you."
  },
  "perks": [{ "fr": "Ce qui est inclus", "en": "What's included" }]
}
```

- **`priceXAF`** — whole francs, no decimals, no spaces. `0` makes the tier
  free, which skips the payment step entirely and issues the ticket straight
  away.
- **`name`** — deliberately not translated: it's a proper noun, and it's
  rendered in the mono-tag style.
- **`onSale`** — set to `false` to take a tier off the page. **Don't delete
  the entry**: past tickets point at it, and removing it would make them
  unreadable.
- **`includesApparel`** — `true` makes the checkout ask for a T-shirt size for
  each attendee. Set it on any tier that comes with clothing, or people will
  receive the wrong size.
- **`quantityAvailable`** — leave it out for unlimited. It's checked at
  checkout, so a tier can't oversell in a single order.

### Changing a price mid-sale

Safe to do: every total is recalculated from this file at the moment someone
pays, so a stale browser tab can't lock in the old price. Tickets already paid
for keep the price they were bought at.

---

## Shop products — `src/data/products.json`

```json
{
  "id": "tee-edition",
  "name": { "fr": "T-shirt DevFest Yaoundé", "en": "DevFest Yaoundé T-shirt" },
  "description": { "fr": "…", "en": "…" },
  "priceXAF": 12000,
  "images": ["/shop/tee-edition.jpg"],
  "variants": { "size": ["S", "M", "L", "XL"], "color": ["Noir"] },
  "status": "pre-order"
}
```

- **`status`** drives the pill on the card, and also what checkout accepts:

  | Status       | Shown as     | Can be bought online? |
  | ------------ | ------------ | --------------------- |
  | `pre-order`  | Pre-order    | yes                   |
  | `in-stock`   | In stock     | yes                   |
  | `venue-only` | At the venue | **no**                |
  | `sold-out`   | Sold out     | **no**                |

  The last two are enforced server-side, so flipping a product to `sold-out`
  stops sales immediately even for someone mid-checkout.

- **`variants`** — if you list sizes, a size becomes **required**. Someone can't
  check out without picking one. Leave `variants` out entirely for items with
  no options (stickers, a mug).
- **`images`** — put files in `public/shop/` and reference them as
  `/shop/filename.jpg`.

---

## Discount codes

These are **not** in a JSON file — they're rows in the `discount_codes` table
in Supabase, because they need a usage counter that survives a deploy.

Add one from the Supabase dashboard (Table editor → `discount_codes`):

| Column            | Meaning                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `code`            | What people type. Uppercase, letters/numbers/dashes.                |
| `kind`            | `percent` or `fixed`                                                |
| `value`           | `20` with `percent` = 20% off. `5000` with `fixed` = 5 000 XAF off. |
| `applies_to`      | `tickets`, `shop`, or `both`                                        |
| `max_redemptions` | Leave empty for unlimited                                           |
| `expires_at`      | Leave empty for no expiry                                           |
| `active`          | Untick to switch a code off without deleting it                     |

A discount can never take a total below zero, and the counter only increments
when a payment actually completes — an abandoned checkout doesn't burn a code.

---

## After any change

Run `npm run verify` (lint, types, tests). The tests read these two files
directly, so a malformed entry — a missing language, a broken variant list —
fails there rather than at someone's checkout.
