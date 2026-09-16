/**
 * POST /api/admin/refund-requests — log a manual refund/exchange request.
 *
 * Organiser-only. This does not move money and does not touch a ticket or
 * order — it is a visibility record for something an organiser is already
 * handling by email or in person (docs/content/refund-policy.md). The list
 * itself is read through `loadAdminData()` on the dashboard's own server
 * render, the same way orders and transactions already are — there is no
 * separate GET here.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  kind: z.enum(["tickets", "shop"]),
  reference: z.string().trim().min(1).max(200),
  requesterName: z.string().trim().min(1).max(200),
  requesterEmail: z.string().trim().email().max(320),
  reason: z.string().trim().min(1).max(2000),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 403);

  const limit = await rateLimit(
    RATE_LIMITS.adminWrite,
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
  const { data, error } = await supabase
    .from("refund_requests")
    .insert({
      kind: parsed.data.kind,
      reference: parsed.data.reference,
      requester_name: parsed.data.requesterName,
      requester_email: parsed.data.requesterEmail,
      reason: parsed.data.reason,
      notes: parsed.data.notes ?? null,
      created_by: organiser.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/refund-requests] insert failed", error.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  await recordAudit({
    actor: organiser.userId,
    action: "refund_request.created",
    target: data.id,
    after: { kind: parsed.data.kind, reference: parsed.data.reference },
  });

  return Response.json({ id: data.id }, { status: 201 });
}
