/**
 * PATCH  /api/admin/refund-requests/:id — move a request along, or add a note
 * DELETE /api/admin/refund-requests/:id — remove a mistaken entry
 *
 * Organiser-only, same as every other admin write. The status transition is
 * validated against the request's CURRENT status read inside the same
 * request, so an out-of-date back-office tab cannot resurrect a resolved
 * request or skip past "in progress" — the exact reasoning
 * `/api/orders/:id/status` already uses for the identical shape of bug.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import {
  canTransition,
  isRefundRequestStatus,
  type RefundRequestStatus,
} from "@/lib/admin/refund-lifecycle";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["requested", "in_progress", "resolved", "denied"]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 403);

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  if (parsed.data.status === undefined && parsed.data.notes === undefined) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const supabase = createAdminSupabase();
  const { data: existing, error: readError } = await supabase
    .from("refund_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("[admin/refund-requests] read failed", readError.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  if (!isRefundRequestStatus(existing.status)) {
    // The CHECK constraint should make this unreachable; refusing rather
    // than trusting an unrecognised value is the safer failure.
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
  const from = existing.status;
  const to = parsed.data.status as RefundRequestStatus | undefined;

  if (to && to !== from && !canTransition(from, to)) {
    return Response.json(
      { error: "invalid_transition", from, to },
      { status: 409 },
    );
  }

  const changingStatus = to !== undefined && to !== from;

  // Compare-and-set on the status read above: if another organiser moved
  // this request between our read and our write, this updates nothing
  // rather than trampling their change.
  const { data: updated, error: writeError } = await supabase
    .from("refund_requests")
    .update({
      updated_at: new Date().toISOString(),
      ...(changingStatus
        ? {
            status: to,
            resolved_at: to === "resolved" ? new Date().toISOString() : null,
          }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    })
    .eq("id", id)
    .eq("status", from)
    .select("id, status, notes")
    .maybeSingle();

  if (writeError) {
    console.error("[admin/refund-requests] write failed", writeError.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
  if (!updated) {
    return Response.json({ error: "conflict", from, to }, { status: 409 });
  }

  await recordAudit({
    actor: organiser.userId,
    action: "refund_request.updated",
    target: id,
    before: { status: from },
    after: { status: updated.status },
  });

  return Response.json({ status: updated.status, changed: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 403);

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const limit = await rateLimit(
    RATE_LIMITS.adminWrite,
    `user:${organiser.userId}`,
  );
  if (!limit.allowed) {
    return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
      retryAfter: limit.retryAfterSeconds,
    });
  }

  const supabase = createAdminSupabase();
  const { data: existing } = await supabase
    .from("refund_requests")
    .select("id, kind, reference")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("refund_requests")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/refund-requests] delete failed", error.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  await recordAudit({
    actor: organiser.userId,
    action: "refund_request.deleted",
    target: id,
    before: { kind: existing.kind, reference: existing.reference },
  });

  return Response.json({ deleted: true });
}
