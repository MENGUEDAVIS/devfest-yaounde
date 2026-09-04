/**
 * POST /api/admin/discounts — create a code.
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { discountWriteSchema, firstZodIssue } from "@/lib/content/schemas";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 404);

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

  const parsed = discountWriteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400, {
      detail: firstZodIssue(parsed.error),
    });
  }
  const input = parsed.data;

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("discount_codes").insert({
    code: input.code,
    kind: input.kind,
    value: input.value,
    applies_to: input.appliesTo,
    max_redemptions: input.maxRedemptions ?? null,
    expires_at: input.expiresAt ?? null,
    active: input.active,
  });

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "duplicate_code" }, { status: 409 });
    }
    console.error("[admin/discounts] insert failed", error.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  await recordAudit({
    actor: organiser.userId,
    action: "discount.create",
    target: input.code,
    after: input,
  });

  return Response.json(
    {
      code: input.code,
      kind: input.kind,
      value: input.value,
      appliesTo: input.appliesTo,
      active: input.active,
      redeemedCount: 0,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ?? null,
    },
    { status: 201 },
  );
}
