/**
 * GET  /api/admin/content/:id  — current collection (DB row or repo file)
 * PUT  /api/admin/content/:id  — publish a validated payload
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import {
  isCollectionId,
  loadCollection,
  saveCollection,
} from "@/lib/content/store";
import { revalidateCollection } from "@/lib/content/revalidate";
import { collectionSchemas } from "@/lib/content/schemas";
import { syncSwagToShop } from "@/lib/content/swag-sync";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 404);

  const { id } = await params;
  if (!isCollectionId(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const payload = await loadCollection(id);
  return Response.json({ id, payload });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;
  if (!isCollectionId(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }
  const payload =
    body && typeof body === "object" && "payload" in body
      ? (body as { payload: unknown }).payload
      : body;

  const before = await loadCollection(id);

  // Swag → shop linkage (ADR: swag-to-shop-linkage) runs BEFORE the tiers
  // payload is persisted: a newly created draft product's id is patched onto
  // the swag item first, so the array actually written already carries the
  // link, and the two collections never disagree about it even for a
  // moment.
  let toSave = payload;
  let createdDrafts: { tierId: string; swagId: string; productId: string }[] =
    [];
  if (id === "ticket-tiers") {
    const parsed = collectionSchemas["ticket-tiers"].safeParse(payload);
    if (!parsed.success) {
      return Response.json(
        { error: "invalid_body", detail: parsed.error.issues[0]?.message },
        { status: 400 },
      );
    }
    const synced = await syncSwagToShop(before, parsed.data, organiser.userId);
    toSave = synced.tiers;
    createdDrafts = synced.createdDrafts;
  }

  const saved = await saveCollection(id, toSave, organiser.userId);
  if (!saved.ok) {
    return Response.json(
      { error: "invalid_body", detail: saved.error },
      { status: 400 },
    );
  }

  await recordAudit({
    actor: organiser.userId,
    action: "content.publish",
    target: id,
    before,
    after: toSave,
  });

  // The public pages are prerendered, so without this the save is real and
  // invisible — the database changes and the site does not.
  revalidateCollection(id);

  return Response.json({ id, saved: true, createdDrafts });
}
