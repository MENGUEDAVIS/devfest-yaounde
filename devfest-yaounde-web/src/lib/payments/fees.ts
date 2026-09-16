/**
 * The transaction fee — 1.5% added on top of every price a visitor or buyer
 * actually pays, tickets and shop alike.
 *
 * Deliberately NOT `server-only`. This is pure arithmetic on a number
 * already public (a tier or product's listed price), and it has to run in
 * two places that must never disagree: the server's real pricing
 * (`pricing.ts`'s `finalise()`, which is what gets charged) and the browse-
 * time "sticker price" shown on a tier or product card, before a basket or
 * a discount exists at all. One shared function, imported by both, is what
 * makes "the buyer never sees one number and is charged another" possible
 * to guarantee rather than merely intend.
 *
 * BASE PRICES ARE THE STORED SOURCE OF TRUTH. `tier.priceXAF` /
 * `product.priceXAF` — what an admin types into the dashboard — is never
 * rewritten to include the fee. It is computed at render/checkout time,
 * every time, from here. That is what makes the fee apply automatically to
 * every existing tier and product, and every future price an admin sets,
 * with no per-item migration.
 */

/** 1.5%, expressed as an exact integer ratio so the one multiply that
 *  matters stays in integer arithmetic — see `feeInclusiveAmount`. */
const FEE_NUMERATOR = 1015;
const FEE_DENOMINATOR = 1000;

/** For copy that states the rate rather than computing with it. */
export const TRANSACTION_FEE_RATE = 0.015;

/**
 * `base` with the fee added, rounded to the nearest whole franc.
 *
 * XAF has no subunit, so every displayed and charged amount must be an
 * integer — a fee-inclusive total with a fraction of a franc left over is
 * not a real amount PawaPay can charge. Rounding rule: half up, the one a
 * buyer expects ("1.5% of 1000 is 15, so 1015" — not 1014 because floating
 * point landed a hair under .5). `Math.round` already rounds half-up for
 * every non-negative number, which is all a price ever is here — the one
 * risk is float drift from the multiply, which is why the multiply happens
 * in integer space first (`base * 1015`, exact for any integer `base` well
 * under Number.MAX_SAFE_INTEGER) and only the single unavoidable division
 * touches floating point, at a scale where IEEE754 error is far below the
 * 0.5 that would ever flip a rounding decision.
 */
export function feeInclusiveAmount(base: number): number {
  return Math.round((base * FEE_NUMERATOR) / FEE_DENOMINATOR);
}

/** Just the fee itself, as its own number — for an itemised row. */
export function transactionFeeAmount(base: number): number {
  return feeInclusiveAmount(base) - base;
}
