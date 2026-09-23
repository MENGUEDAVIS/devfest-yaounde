/**
 * Where a product may appear (PHASE24: ticket-only products).
 *
 * Three states, kept apart on purpose:
 *
 *   - **Shop product** — published, not ticket-only. Listed in the shop, has a
 *     page, can be put in a cart and ordered.
 *   - **Ticket-only** — published, `ticketOnly: true`. NOT in the shop, has no
 *     page, is not in the sitemap and CANNOT be ordered (checkout refuses it),
 *     but is shown as swag on the ticket tiers that bundle it. A certificate,
 *     a lanyard: something that comes WITH a ticket and is never sold alone.
 *   - **Hidden** — `published: false`. Nowhere at all: still being written, or
 *     pulled. Ticket-only does not override this — an unfinished listing stays
 *     off the ticket cards too.
 *
 * Plain functions on a plain shape, no imports from the store, so the rule
 * lives in one place and is unit-tested directly.
 */
type Visible = { published?: boolean; ticketOnly?: boolean };

/** Live at all — absent or true. */
export const isPublished = (product: Visible): boolean =>
  product.published !== false;

/** Listed, viewable and orderable in the shop. */
export const isShopProduct = (product: Visible): boolean =>
  isPublished(product) && !product.ticketOnly;

/** Shown as swag on a ticket tier that bundles it. */
export const isSwagProduct = (product: Visible): boolean =>
  isPublished(product);
