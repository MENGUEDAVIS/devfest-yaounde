# 0049 — Ticket tiers become an admin-editable collection, entitlements and swag included

Date: 2026-09-11
Status: Accepted

## Context

Ticket tiers were already read through the editorial content store
(`getTiers()` → `editorial_documents` row `ticket-tiers`, falling back to
`src/data/ticket-tiers.json` — see `docs/decisions/0031-editorial-store-in-postgres.md`),
the same mechanism as sponsors, speakers and products. What was missing was
an admin **screen**: `AdminTickets.tsx` only lists paid orders, and "Bulk &
photos" only imports/counts JSON. Every tier's price, perks and swag were
therefore only editable by hand-editing the JSON and redeploying.

Phase 20 asked for three things on top of plain CRUD: an editable "what your
ticket grants you" list (entitlements), swag items with real images, and a
sold-out flag independent of `quantityAvailable`. It also asked to drop the
"Student pass" framing from the SONNET tier.

## Decision

**`ticketTierSchema.perks` changes shape**, from `LocalizedString[]` to a
list of entitlement objects:

```ts
{ label: LocalizedString; icon?: string; note?: LocalizedString }
```

`icon` is a closed set (`src/lib/entitlement-icons.ts`), not free text — the
same reasoning as sponsor tiers and product status: an admin cannot type a
Phosphor export name that does not exist. `label` alone reproduces exactly
what every perk rendered as before this feature (a checked bullet); `icon`
and `note` are additive. The public tier card (`TicketCheckout.tsx`) renders
whichever icon is set, defaulting to a plain check.

**`ticketTierSchema.swag` changes shape**, from `LocalizedString[]` to:

```ts
{ id: string; name: LocalizedString; images?: string[]; shopProductId?: string }
```

Each item gets a stable `id` (a `crypto.randomUUID()`, not a slugified name)
so an image can be staged (see the upload note below) and a shop product can
be linked before the item necessarily has a final name. `shopProductId` is
populated by the swag→shop sync (0050), never typed by hand.

**`ticketTierSchema.soldOut: boolean` is new**, independent of
`quantityAvailable`. An admin can pull a tier off sale for a reason the
capacity counter cannot see (holding back seats, a print run that fell
through). Checked in `quoteTierCounts` (`src/lib/payments/pricing.ts`)
alongside the existing quantity check, and rendered on the public card as a
distinct dashed state with a `Prohibit` icon and a text label — never colour
alone (`DESIGN.md` §2.6).

**Uploads are staged, not attached-on-save.** The existing photo pipeline
(`src/lib/content/photos.ts`) attaches a picture to a record that already
exists by id — fine for a cover photo on an established sponsor, wrong for a
brand-new swag item inside a form that has not been saved yet. A new generic
endpoint, `POST /api/admin/uploads/image`, uploads one file to a caller-
chosen folder and returns its URL immediately; the parent form just holds
the URL. `MultiImageUpload` (X/Twitter-style: pick several, each uploads and
previews independently, a failure is scoped to its own file) is the client
side of this, reused by product image galleries (Part B).

**"Student pass" is gone.** SONNET's `label` is now `{fr:"", en:""}`, matching
OPUS/FABLE's no-subtitle pattern; its description dropped the "for students"
framing, and OPUS's own perk text ("everything in the student pass") was
rewritten to name SONNET directly. `src/data/ticket-tiers.json` remains the
seed/fallback for a fresh clone with no database (same convention as every
other collection) — it was migrated to the new shapes rather than emptied.

## Consequences

- Every existing tier (`haikyu`, `sonnet`, `opus`, `fable`, `mythos`) is
  fully admin-editable, with its real current price/description/perks as
  the starting point — nothing was reset to a placeholder.
- `tests/payments.test.ts` and `tests/lifecycle.test.ts` still pass
  unmodified against these ids, prices and `quantityAvailable` values — only
  the shape of `perks`/`swag` and the new `soldOut` field changed, and both
  are additive/reshaped rather than removed.
- A new test (`tests/payments.test.ts`, "refuses a tier flagged sold out,
  even with capacity remaining") locks in that `soldOut` is checked
  independently of quantity.
- **What this does not do**: it does not touch `quantityAvailable`'s
  existing enforcement (the binding check still lives in
  `create_payment_intent`, migration 0002) — `soldOut` is a second,
  independent gate, not a replacement for it.
