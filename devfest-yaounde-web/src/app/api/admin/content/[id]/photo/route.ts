/**
 * POST /api/admin/content/:id/photo
 *
 * Attach a picture to one entry (speaker, team member, sponsor…). The
 * collection must already exist — names first, photos second.
 *
 * Multipart: entryId, image.
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import {
  PHOTO_FIELDS,
  PhotoRejected,
  applyPhotoUrl,
  isPhotoCollection,
  normalisePhoto,
  publicPhotoUrl,
  storagePath,
  storePhoto,
} from "@/lib/content/photos";
import {
  isCollectionId,
  loadCollection,
  saveCollection,
} from "@/lib/content/store";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const organiser = await currentOrganiser();
  if (!organiser) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 404);

  const limit = await rateLimit(
    RATE_LIMITS.adminPhoto,
    `user:${organiser.userId}`,
  );
  if (!limit.allowed) {
    return errorResponse(CHECKOUT_ERRORS.RATE_LIMITED, 429, {
      retryAfter: limit.retryAfterSeconds,
    });
  }

  const { id } = await params;
  if (!isCollectionId(id) || !isPhotoCollection(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const spec = PHOTO_FIELDS[id];
  if (!spec) return Response.json({ error: "not_found" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const entryId = String(form.get("entryId") ?? "").trim();
  const image = form.get("image");
  if (!entryId || !(image instanceof Blob)) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const rows = (await loadCollection(id)) as Record<string, unknown>[];
  const index = rows.findIndex((row) => row.id === entryId);
  if (index < 0) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await normalisePhoto(image);
  } catch (err) {
    if (err instanceof PhotoRejected) {
      return Response.json({ error: err.reason }, { status: 422 });
    }
    console.error("[admin/photo] normalise failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const path = storagePath(id, entryId);
  try {
    await storePhoto(path, bytes);
  } catch (err) {
    console.error("[admin/photo] storage failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const url = publicPhotoUrl(id, entryId);
  const before = rows[index];
  const next = rows.map((row, i) =>
    i === index ? applyPhotoUrl(row, spec, url) : row,
  );

  const saved = await saveCollection(id, next, organiser.userId);
  if (!saved.ok) {
    return Response.json(
      { error: "invalid_body", detail: saved.error },
      { status: 400 },
    );
  }

  await recordAudit({
    actor: organiser.userId,
    action: "content.photo",
    target: `${id}/${entryId}`,
    before: { photo: before[spec.field] },
    after: { photo: url },
  });

  return Response.json({ id, entryId, url });
}
