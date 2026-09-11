/**
 * GET /api/tickets/capacity
 *
 * The public remaining-tickets counter (Phase 20 / A6). No auth — this is a
 * single number shown on the tickets page and its info banner, polled on an
 * interval by `CapacityCounter`. Counting logic lives in
 * `src/lib/payments/capacity.ts`, shared with the tickets page's initial
 * server-rendered value.
 */
import { NextRequest } from "next/server";
import { getTicketCapacity } from "@/lib/payments/capacity";
import { clientIp } from "@/lib/pawapay/verify";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const ip = clientIp(request.headers) ?? "unknown";
  const limit = await rateLimit(RATE_LIMITS.capacityRead, `ip:${ip}`);
  if (!limit.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const capacity = await getTicketCapacity();
  return Response.json(capacity);
}
