/**
 * GET /api/admin/settings
 * PUT /api/admin/settings
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { revalidateSettings } from "@/lib/content/revalidate";
import { loadSettings, saveSettings } from "@/lib/content/settings";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 404);
  return Response.json(await loadSettings());
}

export async function PUT(request: NextRequest) {
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

  const before = await loadSettings();
  const saved = await saveSettings(body as never, organiser.userId);
  if (!saved.ok) return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);

  await recordAudit({
    actor: organiser.userId,
    action: "settings.update",
    target: "site",
    before,
    after: body,
  });

  // Settings reach the announcement banner, which lives in the root layout —
  // so this is every page, not a list of them.
  revalidateSettings();

  return Response.json({ saved: true });
}
