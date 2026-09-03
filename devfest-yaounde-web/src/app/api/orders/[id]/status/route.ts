/**
 * PATCH /api/orders/:id/status — move a shop order along.
 *
 * Body: { status, fulfilment? }
 *
 * Organiser-only. The transition is validated against the order's CURRENT
 * status read inside the same request, so an out-of-date back-office tab
 * cannot skip a step or resurrect a delivered order.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { logPaymentEvent } from "@/lib/payments/intents";
import {
  ORDER_STATUSES,
  canTransition,
  type OrderStatus,
} from "@/lib/payments/order-lifecycle";
import { currentOrganiser } from "@/lib/security/organisers";
import { createAdminSupabase } from "@/lib/supabase/server";
import { toJson } from "@/lib/supabase/json";

const bodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  /**
   * Free-form because the operational model is still open (PAGES.md §11):
   * a pickup note, a courier reference, whatever the team actually uses.
   */
  fulfilment: z
    .object({
      method: z.enum(["pickup", "shipping"]).optional(),
      note: z.string().trim().max(500).optional(),
      reference: z.string().trim().max(120).optional(),
    })
    .optional(),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);

  const supabase = createAdminSupabase();

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("id, status, fulfilment")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("[orders/status] read failed", readError.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
  if (!order) return Response.json({ error: "not_found" }, { status: 404 });

  const from = order.status as OrderStatus;
  const to = parsed.data.status;

  if (from === to) {
    return Response.json({ status: from, changed: false });
  }
  if (!canTransition(from, to)) {
    return Response.json(
      { error: "invalid_transition", from, to },
      { status: 409 },
    );
  }

  // The `eq("status", from)` guard makes this a compare-and-set: if another
  // organiser moved the order between our read and our write, this updates
  // nothing rather than trampling their change.
  const { data: updated, error: writeError } = await supabase
    .from("orders")
    .update({
      status: to,
      // MERGE, never replace. The buyer's own request lives under
      // `requested` (migration 0006); overwriting the column would erase
      // what they asked for the moment an organiser adds a courier
      // reference.
      ...(parsed.data.fulfilment
        ? {
            fulfilment: toJson({
              ...((order.fulfilment as Record<string, unknown> | null) ?? {}),
              ...parsed.data.fulfilment,
            }),
          }
        : {}),
    })
    .eq("id", id)
    .eq("status", from)
    .select("id, status")
    .maybeSingle();

  if (writeError) {
    console.error("[orders/status] write failed", writeError.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }
  if (!updated) {
    return Response.json({ error: "conflict", from, to }, { status: 409 });
  }

  await logPaymentEvent(null, "order_status_changed", {
    orderId: id,
    from,
    to,
    organiserId: organiser.userId,
  });

  return Response.json({ status: updated.status, changed: true });
}
