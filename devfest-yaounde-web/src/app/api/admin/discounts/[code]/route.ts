/**
 * PATCH /api/admin/discounts/:code — update a code (not its redemptions).
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { discountWriteSchema } from "@/lib/content/schemas";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
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

  const { code: raw } = await params;
  const code = raw.trim().toUpperCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const parsed = discountWriteSchema.partial().safeParse(
    body && typeof body === "object" ? { ...body, code } : { code },
  );
  if (!parsed.success) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  const input = parsed.data;
  if (input.kind === "percent" && input.value !== undefined && input.value > 100) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const supabase = createAdminSupabase();
  const { data: existing } = await supabase
    .from("discount_codes")
    .select("code, kind, value, applies_to, max_redemptions, expires_at, active")
    .eq("code", code)
    .maybeSingle();
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("discount_codes")
    .update({
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.appliesTo ? { applies_to: input.appliesTo } : {}),
      ...(input.maxRedemptions !== undefined
        ? { max_redemptions: input.maxRedemptions }
        : {}),
      ...(input.expiresAt !== undefined ? { expires_at: input.expiresAt } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    })
    .eq("code", code);

  if (error) {
    console.error("[admin/discounts] update failed", error.message);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  await recordAudit({
    actor: organiser.userId,
    action: "discount.update",
    target: code,
    before: existing,
    after: input,
  });

  return Response.json({ code, saved: true });
}
