/**
 * Checkout error codes.
 *
 * Routes return a stable `code`, never a prose message — the screens map the
 * code to copy through next-intl, so both languages stay in step and no
 * internal detail leaks into a response (A05: no stack traces in production).
 *
 * Every code here has a matching key under `errors.checkout.*` in
 * messages/fr.json and messages/en.json.
 */
export const CHECKOUT_ERRORS = {
  UNAUTHENTICATED: "unauthenticated",
  INVALID_BODY: "invalid_body",
  RATE_LIMITED: "rate_limited",
  UNKNOWN_TIER: "unknown_tier",
  TIER_NOT_ON_SALE: "tier_not_on_sale",
  TIER_SOLD_OUT: "tier_sold_out",
  UNKNOWN_PRODUCT: "unknown_product",
  PRODUCT_UNAVAILABLE: "product_unavailable",
  INVALID_VARIANT: "invalid_variant",
  APPAREL_SIZE_REQUIRED: "apparel_size_required",
  ATTENDEE_COUNT_MISMATCH: "attendee_count_mismatch",
  EMPTY_BASKET: "empty_basket",
  DISCOUNT_INVALID: "discount_invalid",
  DISCOUNT_EXPIRED: "discount_expired",
  DISCOUNT_EXHAUSTED: "discount_exhausted",
  DISCOUNT_NOT_APPLICABLE: "discount_not_applicable",
  PAYMENT_PAGE_FAILED: "payment_page_failed",
  SERVER_ERROR: "server_error",
} as const;

export type CheckoutErrorCode =
  (typeof CHECKOUT_ERRORS)[keyof typeof CHECKOUT_ERRORS];

export class CheckoutError extends Error {
  readonly code: CheckoutErrorCode;
  readonly status: number;

  constructor(code: CheckoutErrorCode, status = 400) {
    super(code);
    this.name = "CheckoutError";
    this.code = code;
    this.status = status;
  }
}

/** Uniform failure envelope. Deliberately carries no internal detail. */
export function errorResponse(
  code: CheckoutErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: code, ...extra }, { status });
}
