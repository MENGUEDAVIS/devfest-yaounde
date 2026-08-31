/**
 * POST /api/checkout/tickets
 *
 * Body: { attendees[], discountCode?, contact{ email, phone? }, locale }
 * Returns: { depositId, redirectUrl? , fulfilled, charged, currency }
 *
 * `redirectUrl` is absent when the basket came to 0 XAF (free tier) — the
 * tickets already exist and the screen can go straight to the confirmation.
 */
import { NextRequest } from "next/server";
import {
  CHECKOUT_ERRORS,
  CheckoutError,
  errorResponse,
} from "@/lib/payments/errors";
import { ticketCheckoutSchema } from "@/lib/payments/schemas";
import { quoteTickets } from "@/lib/payments/pricing";
import { startCheckout } from "@/lib/payments/checkout";
import { currentUser } from "@/lib/supabase/server";
import {
  RATE_LIMITS,
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

  const parsed = ticketCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }
  const input = parsed.data;

  // A discount code is guessable by design, so its own bucket throttles the
  // guessing without punishing someone retrying a legitimate checkout.
  if (input.discountCode) {
    const codeLimit = await rateLimit(RATE_LIMITS.discountCode, identity);
    if (!codeLimit.allowed) {
      return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
        retryAfter: codeLimit.retryAfterSeconds,
      });
    }
  }

  try {
    const quote = await quoteTickets(input.attendees, input.discountCode);
    const result = await startCheckout({
      userId: user.id,
      kind: "tickets",
      quote,
      attendees: input.attendees,
      contact: input.contact,
      locale: input.locale,
    });
    return Response.json({ ...result, quote });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return errorResponse(err.code, err.status);
    }
    // A05: log the detail, return none of it.
    console.error("[checkout/tickets] unexpected failure", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
}
