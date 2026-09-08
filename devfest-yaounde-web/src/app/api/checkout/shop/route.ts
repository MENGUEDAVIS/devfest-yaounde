/**
 * POST /api/checkout/shop
 *
 * Body: { cart[], discountCode?, contact{ email, phone? }, locale }
 * Returns: { depositId, redirectUrl, fulfilled, charged, currency, quote }
 *
 * Same shape and same guarantees as the ticket checkout — PAGES.md §8 asks
 * the shop to reuse the ticket payment pattern, so it reuses the code too.
 */
import { NextRequest } from "next/server";
import {
  CHECKOUT_ERRORS,
  CheckoutError,
  errorResponse,
  isDiscountFailure,
} from "@/lib/payments/errors";
import { shopCheckoutSchema } from "@/lib/payments/schemas";
import { quoteCart } from "@/lib/payments/pricing";
import { startCheckout } from "@/lib/payments/checkout";
import { currentUser } from "@/lib/supabase/server";
import {
  RATE_LIMITS,
  consumeOnDiscountFailure,
  rateLimit,
  rateLimitIdentity,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);
  }

  const identity = rateLimitIdentity(user.id, request.headers);
  const limit = await rateLimit(RATE_LIMITS.checkout, identity);
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

  const parsed = shopCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }
  const input = parsed.data;

  try {
    const quote = await quoteCart(input.cart, input.discountCode);
    const result = await startCheckout({
      userId: user.id,
      kind: "shop",
      quote,
      contact: input.contact,
      locale: input.locale,
      fulfilment: input.fulfilment,
    });
    return Response.json({ ...result, quote });
  } catch (err) {
    if (err instanceof CheckoutError) {
      // A discount code is guessable by design. The fence is charged for a
      // WRONG code only — every guess is wrong, so guessing still costs,
      // while a real code does not spend the budget of someone who is simply
      // retrying a legitimate checkout.
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
    console.error("[checkout/shop] unexpected failure", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
}
