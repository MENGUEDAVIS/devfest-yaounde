/**
 * GET /api/payments/status?depositId=...
 *
 * What the return page polls while it waits. The browser coming back from
 * PawaPay proves nothing — the tab can be closed, or reopened by someone
 * else — so this endpoint re-asks the API rather than believing the redirect.
 *
 * It deliberately does NOT fulfil. Delivery happens in exactly one place
 * (the callback), so a fast poll racing a callback cannot double-deliver.
 * Once the callback has run, this simply reports the stored status.
 */
import { NextRequest } from "next/server";
import { checkDepositStatus } from "@/lib/pawapay/client";
import { getPaymentIntent } from "@/lib/payments/intents";
import { depositIdSchema } from "@/lib/payments/schemas";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentUser } from "@/lib/supabase/server";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitIdentity,
} from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);

  const limit = await rateLimit(
    RATE_LIMITS.paymentStatus,
    rateLimitIdentity(user.id, request.headers),
  );
  if (!limit.allowed) {
    return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
      retryAfter: limit.retryAfterSeconds,
    });
  }

  const parsed = depositIdSchema.safeParse(
    request.nextUrl.searchParams.get("depositId"),
  );
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);

  const intent = await getPaymentIntent(parsed.data);

  // A01: an intent belonging to someone else is indistinguishable from one
  // that does not exist. No oracle for guessing deposit ids.
  if (!intent || intent.user_id !== user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // Already settled by the callback — answer without troubling PawaPay.
  if (intent.status !== "pending") {
    return Response.json({
      status: intent.status,
      charged: intent.charged_amount,
      currency: intent.currency,
      kind: intent.kind,
    });
  }

  // Still pending locally: the callback may simply be in flight.
  try {
    const lookup = await checkDepositStatus(parsed.data);
    return Response.json({
      status: "pending",
      providerStatus: lookup.data?.status ?? "PENDING",
      charged: intent.charged_amount,
      currency: intent.currency,
      kind: intent.kind,
    });
  } catch {
    // PawaPay unreachable is not the poller's problem — keep it waiting.
    return Response.json({
      status: "pending",
      providerStatus: "UNKNOWN",
      charged: intent.charged_amount,
      currency: intent.currency,
      kind: intent.kind,
    });
  }
}
