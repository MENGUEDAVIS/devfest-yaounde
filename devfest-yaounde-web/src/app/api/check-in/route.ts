/**
 * POST /api/check-in — scan a badge at the door.
 *
 * Body: { badgeCode: "DFY-XXXXX-XXXXX" }
 *
 * Organiser-only. The actual marking happens in `check_in_ticket`, which
 * claims the row `FOR UPDATE`, so two volunteers scanning the same badge at
 * the same moment cannot both record a first entry — the second one is told
 * when it was already used.
 *
 * "Already checked in" is a 200, not an error: at a door it is normal
 * information, and the person scanning needs the timestamp, not a red screen.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { logPaymentEvent } from "@/lib/payments/intents";
import { currentOrganiser } from "@/lib/security/organisers";
import { createAdminSupabase } from "@/lib/supabase/server";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

/** Shape is fixed by badge-code.ts; anything else is a typo or a probe. */
const bodySchema = z.object({
  badgeCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^DFY-[0-9A-HJ-NP-TV-Z]{5}-[0-9A-HJ-NP-TV-Z]{5}$/,
      "invalid badge code",
    ),
});

export async function POST(request: NextRequest) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 403);

  // Bounds brute-forcing of the code space by a compromised organiser session.
  const limit = await rateLimit(
    RATE_LIMITS.checkIn,
    `user:${organiser.userId}`,
  );
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_badge_code: parsed.data.badgeCode,
  });

  if (error) {
    console.error("[check-in] rpc failed", error.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const result = data as {
    status: "checked_in" | "already_checked_in" | "not_found";
    attendeeName?: string;
    tierId?: string;
    checkedInAt?: string;
  };

  // A09: who scanned what, without writing the attendee's name into the log.
  await logPaymentEvent(null, `checkin_${result.status}`, {
    organiserId: organiser.userId,
    tierId: result.tierId ?? null,
  });

  return Response.json(result, {
    status: result.status === "not_found" ? 404 : 200,
  });
}
