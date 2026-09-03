/**
 * Server-side pricing. Every total the buyer is charged is produced here,
 * from the catalog, from ids only.
 *
 * The client sends: which tier / which product, how many, which variant, and
 * optionally a discount code. It does not send money, and if it does, the
 * value is dropped on the floor.
 */
import "server-only";
import type {
  AttendeeInput,
  CartLine,
  PricedBasket,
  PricedLine,
} from "@/data/types";
import {
  CURRENCY,
  declaredStock,
  findProduct,
  findTier,
  isPurchasable,
  isValidVariant,
  loadProducts,
  loadTiers,
} from "./catalog";
import { CHECKOUT_ERRORS, CheckoutError } from "./errors";
import { createAdminSupabase } from "@/lib/supabase/server";

/** Nobody needs 200 hoodies, and an unbounded quantity is a denial-of-wallet. */
const MAX_QUANTITY_PER_LINE = 10;
const MAX_TICKETS_PER_ORDER = 10;

interface DiscountRow {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  applies_to: "tickets" | "shop" | "both";
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  active: boolean;
}

/**
 * Looks a code up and validates it against this basket. Throws a
 * `CheckoutError` with a specific code so the screen can say *why* it failed
 * — "expired" and "already used up" are different disappointments.
 */
async function resolveDiscount(
  code: string,
  kind: "tickets" | "shop",
): Promise<DiscountRow> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle<DiscountRow>();

  if (error) throw new CheckoutError(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  if (!data || !data.active)
    throw new CheckoutError(CHECKOUT_ERRORS.DISCOUNT_INVALID);

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    throw new CheckoutError(CHECKOUT_ERRORS.DISCOUNT_EXPIRED);
  }
  if (
    data.max_redemptions !== null &&
    data.redeemed_count >= data.max_redemptions
  ) {
    throw new CheckoutError(CHECKOUT_ERRORS.DISCOUNT_EXHAUSTED);
  }
  if (data.applies_to !== "both" && data.applies_to !== kind) {
    throw new CheckoutError(CHECKOUT_ERRORS.DISCOUNT_NOT_APPLICABLE);
  }
  return data;
}

function applyDiscount(subtotal: number, discount: DiscountRow): number {
  const raw =
    discount.kind === "percent"
      ? Math.floor((subtotal * discount.value) / 100)
      : discount.value;
  // Never below zero, and never a negative charge.
  return Math.min(Math.max(raw, 0), subtotal);
}

function finalise(
  lines: PricedLine[],
  discount: DiscountRow | null,
): PricedBasket {
  const subtotal = lines.reduce((sum, line) => sum + line.lineAmount, 0);
  const discountAmount = discount ? applyDiscount(subtotal, discount) : 0;
  const charged = subtotal - discountAmount;

  return {
    lines,
    subtotal,
    discountCode: discount?.code,
    discountAmount,
    charged,
    // Net is what actually lands with us. Identical to `charged` today; kept
    // separate so a future gateway fee has somewhere to live without
    // rewriting every stored intent.
    net: charged,
    currency: CURRENCY,
  };
}

/**
 * Prices a ticket order from the attendee list. The list IS the quantity:
 * three attendees on the Sonnet tier means three Sonnet tickets, which is
 * also what stops "quantity 3, one attendee, one paid ticket" from working.
 */
export async function quoteTickets(
  attendees: AttendeeInput[],
  discountCode?: string,
): Promise<PricedBasket> {
  if (attendees.length === 0) {
    throw new CheckoutError(CHECKOUT_ERRORS.EMPTY_BASKET);
  }
  if (attendees.length > MAX_TICKETS_PER_ORDER) {
    throw new CheckoutError(CHECKOUT_ERRORS.ATTENDEE_COUNT_MISMATCH);
  }

  const tiers = await loadTiers();
  const counts = new Map<string, AttendeeInput[]>();
  for (const attendee of attendees) {
    const tier = findTier(attendee.tierId, tiers);
    if (!tier) throw new CheckoutError(CHECKOUT_ERRORS.UNKNOWN_TIER);
    if (!tier.onSale) throw new CheckoutError(CHECKOUT_ERRORS.TIER_NOT_ON_SALE);
    // `rsvpExternal` is not a display hint. The tier is not sold here at all:
    // the RSVP is delegated to the community platform, which enforces one per
    // person. Without this check a direct POST mints unlimited free tickets
    // with valid badge codes and bypasses that rule entirely.
    if (tier.rsvpExternal) {
      throw new CheckoutError(CHECKOUT_ERRORS.TIER_RSVP_EXTERNAL);
    }
    if (tier.includesApparel && !attendee.apparelSize) {
      throw new CheckoutError(CHECKOUT_ERRORS.APPAREL_SIZE_REQUIRED);
    }
    const bucket = counts.get(attendee.tierId) ?? [];
    bucket.push(attendee);
    counts.set(attendee.tierId, bucket);
  }

  const lines: PricedLine[] = [];
  for (const [tierId, group] of counts) {
    const tier = findTier(tierId, tiers)!;
    // Optimistic fast-fail only: one order asking for more than the tier ever
    // had. It says nothing about what is still free, because a count taken
    // here would be stale by the time we insert. The binding check is the
    // reservation inside `create_payment_intent` — see intents.ts.
    if (
      tier.quantityAvailable !== undefined &&
      group.length > tier.quantityAvailable
    ) {
      throw new CheckoutError(CHECKOUT_ERRORS.TIER_SOLD_OUT);
    }
    lines.push({
      productId: tier.id,
      name: { fr: tier.name, en: tier.name },
      quantity: group.length,
      unitAmount: tier.priceXAF,
      lineAmount: tier.priceXAF * group.length,
    });
  }

  const discount = discountCode
    ? await resolveDiscount(discountCode, "tickets")
    : null;
  return finalise(lines, discount);
}

/** Prices a shop cart. Same rules: ids in, catalog prices out. */
export async function quoteCart(
  cart: CartLine[],
  discountCode?: string,
): Promise<PricedBasket> {
  if (cart.length === 0) throw new CheckoutError(CHECKOUT_ERRORS.EMPTY_BASKET);

  const products = await loadProducts();
  const lines: PricedLine[] = [];
  for (const line of cart) {
    const product = findProduct(line.productId, products);
    if (!product) throw new CheckoutError(CHECKOUT_ERRORS.UNKNOWN_PRODUCT);
    if (!isPurchasable(product)) {
      // "venue-only" and "sold-out" are both real states a stale tab can hit.
      throw new CheckoutError(CHECKOUT_ERRORS.PRODUCT_UNAVAILABLE);
    }
    if (!isValidVariant(product, line.variant)) {
      throw new CheckoutError(CHECKOUT_ERRORS.INVALID_VARIANT);
    }
    if (line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutError(CHECKOUT_ERRORS.INVALID_BODY);
    }
    // Optimistic fast-fail, exactly like the tier check above: one order
    // asking for more than this combination ever had. It says nothing about
    // what is still free — a count taken here is stale by the time we insert.
    // The binding check is the reservation in `create_payment_intent`.
    const declared = declaredStock(product.id, line.variant, products);
    if (declared !== undefined && line.quantity > declared) {
      throw new CheckoutError(CHECKOUT_ERRORS.VARIANT_SOLD_OUT);
    }

    lines.push({
      productId: product.id,
      name: product.name,
      quantity: line.quantity,
      unitAmount: product.priceXAF,
      lineAmount: product.priceXAF * line.quantity,
      variant: line.variant,
    });
  }

  const discount = discountCode
    ? await resolveDiscount(discountCode, "shop")
    : null;
  return finalise(lines, discount);
}
