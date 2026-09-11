# Updating ticket tiers and shop products

**Both ticket tiers and shop products are edited from the admin dashboard**
(Ticket tiers and Shop, under Commerce) since Phase 20 — no file edit, no
developer, no redeploy. `src/data/ticket-tiers.json` and
`src/data/products.json` remain the seed/fallback for a fresh clone with no
database, same convention as every other editorial collection, and the same
rules as `updating-content.md` apply to what you type:

1. **Both languages, always.** Any field written as `{ "fr": "…", "en": "…" }`
   needs both filled in.
2. **`id` must be unique** and shouldn't change once anyone has bought it —
   past tickets and orders reference it.

> ## The tier names are real; the prices and content are still to confirm
>
> `HAIKYU`, `SONNET`, `OPUS`, `FABLE`, `MYTHOS` are the tier identity — the
> Claude-model naming is a settled choice, not a placeholder. Their prices,
> perks, entitlements and swag are still invented and need a real decision
> before sales open (`docs/setup/deployment.md`'s pre-launch checklist lists
> this as a blocker). Changing any of it is now a dashboard edit, not a file
> edit — see below.

---

## Ticket tiers — the "Ticket tiers" dashboard screen

`src/data/ticket-tiers.json` is still there as the **seed/fallback** a fresh
clone with no database renders from (same convention as every other
editorial collection) — once a save happens from the dashboard, the database
row is the live source and the file is no longer read.

- **Price, on-sale, apparel, quantity** — plain fields, same meaning as
  before: `priceXAF` in whole francs (`0` = free, skips payment entirely);
  `onSale: false` takes a tier off the page without deleting it (past
  tickets point at the id); `includesApparel` asks for a size per attendee;
  `quantityAvailable` left blank means unlimited, and is still the number
  checkout actually enforces.
- **Sold out** — a separate switch from quantity. Use it to pull a tier off
  sale for a reason the remaining-quantity count doesn't know about (holding
  back seats, a print run that fell through). Enforced server-side the same
  way quantity is.
- **What this ticket grants you** (entitlements) — a reorderable list of
  `{ label, icon?, note? }`. `label` is what used to be a plain perk string;
  `icon` picks from a fixed set (no free text) and `note` is an optional
  smaller line under the label.
- **Swag** — named items with real images (drag/select several — each
  uploads and previews immediately, independent of the others). **Every
  swag item also becomes a shop listing automatically**, created as a hidden
  draft until someone fills in its price/stock/status on the Shop screen —
  see the swag→shop linkage ADR (`docs/decisions/0050-swag-to-shop-linkage.md`).
  Removing a swag item unlinks its product rather than deleting it.
- **Deleting a tier** requires typing its id to confirm, and is blocked
  outright if it already has sold tickets — turn off "On sale" or mark it
  sold out instead.

### Changing a price mid-sale

Safe to do: every total is recalculated from the tier data at the moment
someone pays, so a stale browser tab can't lock in the old price. Tickets
already paid for keep the price they were bought at.

---

## Shop products — the "Shop" dashboard screen

- **Status** drives the pill on the card, and also what checkout accepts:

  | Status       | Shown as     | Can be bought online? |
  | ------------ | ------------ | --------------------- |
  | `pre-order`  | Pre-order    | yes                   |
  | `in-stock`   | In stock     | yes                   |
  | `venue-only` | At the venue | **no**                |
  | `sold-out`   | Sold out     | **no**                |

  The last two are enforced server-side, so flipping a product to `sold-out`
  stops sales immediately even for someone mid-checkout.

- **Sizes/colors** — turning on a size makes it **required**: someone cannot
  check out without picking one. Leave every size and color off for an item
  with no options (stickers, a mug).
- **Images** — drag/select several; each uploads and previews immediately,
  independent of the others (the same staged uploader as ticket swag). The
  first one is the card cover.
- **Stock per combination** — omit a combination to leave it unlimited.
  Declared here, counted in the database against real orders (ADR 0024) —
  this number is a cap, not a live count.
- **Published** — off keeps a listing off the public shop entirely. New
  products default to published; a product **auto-created from a ticket's
  swag item** (see `docs/decisions/0050-swag-to-shop-linkage.md`) defaults to
  **unpublished**, and the toggle is disabled until it has a price above 0
  and at least one image — the "needs completion" filter on this screen
  finds every one still in that state. A product linked to a tier's swag
  shows which tier, with a link back to it.
- **Deleting a product** requires typing its id to confirm, and is blocked
  outright if it is linked to an existing order — mark it `sold-out` or
  unpublish it instead.
- **No category field.** Filtering is by status and search — see G11 in
  `docs/backend/GAPS.md` for why one was not added.

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

---

## What the public site does with each catalog field

Edited from the Shop dashboard screen now, not the JSON file (above). The
server prices from the same source by id, so a price set there is the price
charged — there is no second place to change.

| Field                      | Where it shows                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `name`, `description`      | Card, detail page, order summary                                                                 |
| `priceXAF`                 | Everywhere a price appears; **the server recomputes from this**                                  |
| `images[]`                 | First image on the card; all of them as thumbnails on the detail                                 |
| `variants.size` / `.color` | Selectable chips. A sized product will not add to the bag without a size — the server rejects it |
| `stock[]`                  | Per-combination cap, counted against real orders (ADR 0024) — not a UI field on the public site  |
| `status`                   | The pill, **and** whether it can be bought at all                                                |
| `published`                | Whether it appears at all — false stays entirely off the public shop                              |

**Retiring a product** is `status: "sold-out"` or `published: false` — never
delete it once it has an order, because past orders reference the id (the
dashboard blocks that delete outright).

**No categories.** The filter is by availability and search instead — see
G11 in `docs/backend/GAPS.md` for why (packages, not plain categories, and
the shape isn't settled).

Ticket tiers are edited from the dashboard now (above), not the JSON file —
but `quantityAvailable` is still the **capacity the server enforces**;
leaving it blank makes a tier uncapped, and that is covered by a test for
that reason. The **overall event capacity** shown publicly (Info bar &
policies → Ticket capacity) is a separate, admin-set figure — it does not
enforce anything at checkout by itself; see
`docs/decisions/0051-ticket-capacity-vs-tier-caps.md`.
