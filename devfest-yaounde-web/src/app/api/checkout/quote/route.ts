/**
 * POST /api/checkout/quote — what this basket costs, before paying for it.
 *
 * Body: { kind: "tickets", tiers[] } | { kind: "shop", cart[] }, discountCode?
 * Returns: { subtotal, discountCode, discountAmount, charged, currency }
 *
 * ## This reverses a documented decision, on purpose
 *
 * `GAPS.md` G4 ruled out a "check this code" endpoint because it would be a
 * free oracle for guessing codes. The reasoning was sound; the conclusion was
 * too strong, and it cost the buyer something real. The discount was applied
 * out of sight, so the first honest total appeared on PawaPay's page — after
 * the point of no return. Finding out what you owe at the till is not a
 * checkout, it is an ambush. See ADR 0036.
 *
 * What makes it defensible is that the oracle already existed: anyone could
 * POST a real checkout and read `discount_invalid` off the response. The only
 * thing in the way was the cost of creating an intent. The fence was never
 * "there is no endpoint" — it was always the rate limit.
 *
 *   - Sign-in required, so a guess is attributable to a Google identity
 *     rather than to a stranger.
 *   - Every call is metered by the `quote` bucket, which is generous because
 *     re-pricing a basket is the feature working.
 *   - A WRONG code, and only a wrong code, charges the `discountCode` fence.
 *     Every guess an attacker makes is wrong, so guessing still costs; a
 *     buyer holding a real code re-prices for free as their basket changes.
 *   - Nothing is created, reserved or incremented. The redemption is still
 *     claimed inside `create_payment_intent`, at payment time, once.
 *
 * The total returned here is not a promise. The server re-prices from the
 * catalog at checkout, and that later number is the one charged.
 */
import { NextRequest } from "next/server";
import {
  CHECKOUT_ERRORS,
  CheckoutError,
  errorResponse,
  isDiscountFailure,
} from "@/lib/payments/errors";
import { quoteCart, quoteTierCounts } from "@/lib/payments/pricing";
import { quoteSchema } from "@/lib/payments/schemas";
import {
  RATE_LIMITS,
  consumeOnDiscountFailure,
  rateLimit,
  rateLimitIdentity,
} from "@/lib/security/rate-limit";
import { currentUser } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);

  const identity = rateLimitIdentity(user.id, request.headers);

  const limit = await rateLimit(RATE_LIMITS.quote, identity);
  if (!limit.allowed) {
    return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
      retryAfter: limit.retryAfterSeconds,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  const input = parsed.data;

  try {
    const quote =
      input.kind === "tickets"
        ? await quoteTierCounts(input.tiers, input.discountCode)
        : await quoteCart(input.cart, input.discountCode);

    // The line breakdown stays out of the response: the screen already has
    // the catalog and renders its own lines from it. What it cannot compute —
    // and must never guess — is the discount.
    return Response.json({
      subtotal: quote.subtotal,
      discountCode: quote.discountCode ?? null,
      discountAmount: quote.discountAmount,
      charged: quote.charged,
      currency: quote.currency,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      if (isDiscountFailure(err.code)) {
        const spent = await consumeOnDiscountFailure(identity);
        if (spent) {
          return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
            retryAfter: RATE_LIMITS.discountCode.windowSeconds,
          });
        }
      }
      return errorResponse(err.code, err.status);
    }
    // A05: log the detail, return none of it.
    console.error("[checkout/quote] unexpected failure", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
}
