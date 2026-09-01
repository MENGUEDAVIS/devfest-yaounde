/**
 * GET /api/payments/status?depositId=...
 *
 * What the return page polls while it waits. The browser coming back from
 * PawaPay proves nothing — the tab can be closed, or reopened by someone
 * else — so this endpoint re-asks the API rather than believing the redirect.
 *
 * It also FULFILS. That is not a shortcut: `apply_paid_deposit` claims the
 * intent with `FOR UPDATE` behind a `status = 'pending'` guard, so a poll
 * racing a callback — or two polls racing each other — serialise into
 * exactly one delivery. The single-call-site rule was never what made
 * fulfilment safe; the database guard is.
 *
 * This is what lets the whole flow work WITHOUT a callback at all, which
 * matters because one PawaPay account has one callback URL per operation
 * type and this one is already spoken for. See ADR 0019.
 */
import { NextRequest } from "next/server";
import { checkDepositStatus } from "@/lib/pawapay/client";
import { applyDepositIfCompleted } from "@/lib/payments/apply";
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

  // Already settled — answer without troubling PawaPay.
  if (intent.status !== "pending") {
    return Response.json({
      status: intent.status,
      charged: intent.charged_amount,
      currency: intent.currency,
      kind: intent.kind,
    });
  }

  // Still pending locally. Ask PawaPay, and act on the answer rather than
  // waiting to be told: this poll is the primary settlement path.
  try {
    const outcome = await applyDepositIfCompleted(parsed.data);

    if (outcome === "applied" || outcome === "already_applied") {
      return Response.json({
        status: "activated",
        charged: intent.charged_amount,
        currency: intent.currency,
        kind: intent.kind,
      });
    }
    if (outcome === "failed" || outcome === "amount_mismatch") {
      return Response.json({
        status: outcome,
        charged: intent.charged_amount,
        currency: intent.currency,
        kind: intent.kind,
      });
    }

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
