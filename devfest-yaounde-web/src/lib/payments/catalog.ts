/**
 * The catalog, read from src/data/*.json.
 *
 * This is the ONLY place a price comes from. Nothing in a request body is
 * ever treated as a price — a client that sends `priceXAF: 1` gets charged
 * the real amount, because the real amount is looked up here by id.
 */
import ticketTiersJson from "@/data/ticket-tiers.json";
import productsJson from "@/data/products.json";
import type { Product, ProductStatus, TicketTier } from "@/data/types";

export const CURRENCY = "XAF" as const;
/** ISO-3166 alpha-3, required by PawaPay's Payment Page. */
export const COUNTRY = "CMR" as const;

const tiers = ticketTiersJson as TicketTier[];
const products = productsJson as Product[];

/** Tiers a buyer may pick right now. */
export function sellableTiers(): TicketTier[] {
  return tiers.filter((tier) => tier.onSale);
}

/** Every tier, including retired ones — past tickets must stay resolvable. */
export function findTier(id: string): TicketTier | undefined {
  return tiers.find((tier) => tier.id === id);
}

export function allProducts(): Product[] {
  return products;
}

export function findProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

/** Statuses that can actually go through checkout. */
const PURCHASABLE: ReadonlySet<ProductStatus> = new Set([
  "pre-order",
  "in-stock",
]);

export function isPurchasable(product: Product): boolean {
  return PURCHASABLE.has(product.status);
}

/**
 * A variant choice is valid only if the product declares that dimension and
 * lists that exact value. Products with no variants accept no variant.
 */
export function isValidVariant(
  product: Product,
  variant?: { size?: string; color?: string },
): boolean {
  if (!variant || (!variant.size && !variant.color)) {
    // A product that offers sizes must have one picked.
    return !product.variants?.size?.length;
  }
  if (variant.size) {
    const sizes = product.variants?.size;
    if (!sizes?.includes(variant.size as never)) return false;
  }
  if (variant.color) {
    const colors = product.variants?.color;
    if (!colors?.includes(variant.color)) return false;
  }
  return true;
}

/**
 * Capacity per tier, for the reservation check in `create_payment_intent`.
 * A tier with no `quantityAvailable` is omitted, which the SQL reads as
 * unlimited. Capacity lives in JSON rather than the database so an organiser
 * can change it with a file edit; the database only counts against it.
 */
export function tierCapacities(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tier of tiers) {
    if (tier.quantityAvailable !== undefined) {
      out[tier.id] = tier.quantityAvailable;
    }
  }
  return out;
}

/**
 * How long a pending checkout holds its seats and its discount redemption.
 * Long enough to finish a Mobile Money prompt on a slow network, short
 * enough that an abandoned tab does not sit on the last ticket all day.
 */
export const RESERVATION_WINDOW_SECONDS = 1800;

/**
 * Per-variant stock (G12).
 *
 * Same split as ticket tiers: the number is declared in `products.json`, and
 * the database counts what has actually been sold against it. A product with
 * no `stock` entry, or a combination absent from it, is unlimited.
 */

/**
 * The key a variant is counted under. Deterministic and shared by the JSON,
 * the SQL and the UI — two spellings of the same combination would silently
 * split one stock figure in half.
 */
export function variantKey(
  productId: string,
  variant?: { size?: string; color?: string },
): string {
  return `${productId}|${variant?.size ?? ""}|${variant?.color ?? ""}`;
}

/** Declared stock for every capped combination, keyed for the reservation. */
export function variantCapacities(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const product of products) {
    for (const row of product.stock ?? []) {
      out[variantKey(product.id, row)] = row.quantity;
    }
  }
  return out;
}

/** What the catalog says about one combination. `undefined` = unlimited. */
export function declaredStock(
  productId: string,
  variant?: { size?: string; color?: string },
): number | undefined {
  const product = findProduct(productId);
  const row = product?.stock?.find(
    (s) =>
      (s.size ?? "") === (variant?.size ?? "") &&
      (s.color ?? "") === (variant?.color ?? ""),
  );
  return row?.quantity;
}
