/**
 * GET /api/cron/cleanup — housekeeping, run on a schedule.
 *
 * Two jobs:
 *   1. Fail intents that were never paid. This is not cosmetic: a pending
 *      intent holds tier capacity and a discount redemption, so leaving them
 *      around slowly makes a tier look sold out when it is not.
 *   2. Drop rate-limit counters whose window has long passed.
 *
 * Protected by a shared secret rather than a session, because the caller is
 * Vercel Cron, not a person. Without `CRON_SECRET` set the route refuses
 * outright — an unauthenticated endpoint that mutates payment state is not
 * something to leave open by default.
 */
import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { logPaymentEvent } from "@/lib/payments/intents";

/** Comfortably past the reservation window, so nothing live is touched. */
const STALE_INTENT_SECONDS = 3600;
const RATE_LIMIT_RETENTION_SECONDS = 86_400;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  const { data: expired, error: expireError } = await supabase.rpc(
    "expire_stale_intents",
    { p_older_than_seconds: STALE_INTENT_SECONDS },
  );

  const { data: pruned, error: pruneError } = await supabase.rpc(
    "cleanup_rate_limits",
    { p_older_than_seconds: RATE_LIMIT_RETENTION_SECONDS },
  );

  if (expireError || pruneError) {
    console.error("[cron/cleanup] failed", {
      expire: expireError?.message,
      prune: pruneError?.message,
    });
    return Response.json({ error: "cleanup_failed" }, { status: 500 });
  }

  const result = {
    expiredIntents: Number(expired ?? 0),
    prunedRateLimits: Number(pruned ?? 0),
  };

  // Only worth an audit line when it actually did something.
  if (result.expiredIntents > 0) {
    await logPaymentEvent(null, "intents_expired", result);
  }

  return Response.json(result);
}
