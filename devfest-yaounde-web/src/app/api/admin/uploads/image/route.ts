/**
 * POST /api/admin/uploads/image
 *
 * Uploads ONE image and returns its URL — nothing else. Built for the
 * X/Twitter-style staged multi-image picker (`MultiImageUpload`): each file
 * lands here the moment it is picked, independently of every other file and
 * independently of the record it will eventually belong to. That record may
 * not exist yet (a brand-new swag item, a product being drafted), which is
 * exactly why this differs from `content/[id]/photo` — that route attaches
 * to an EXISTING row by id; this one just stores bytes and hands back a URL
 * for the caller's form state to hold until Save.
 *
 * Multipart: `file`, `path` (a folder key, e.g. "tickets/sonnet/swag").
 */
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { recordAudit } from "@/lib/admin/audit";
import {
  PhotoRejected,
  isSafeUploadPath,
  normalisePhoto,
  publicStorageUrl,
  storePhoto,
} from "@/lib/content/photos";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const path = String(form.get("path") ?? "")
    .trim()
    .toLowerCase();
  const file = form.get("file");
  if (!isSafeUploadPath(path) || !(file instanceof Blob)) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  let bytes: Buffer;
  try {
    bytes = await normalisePhoto(file);
  } catch (err) {
    if (err instanceof PhotoRejected) {
      return Response.json({ error: err.reason }, { status: 422 });
    }
    console.error("[admin/uploads/image] normalise failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const key = `${path}/${randomUUID()}.jpg`;
  try {
    await storePhoto(key, bytes);
  } catch (err) {
    console.error("[admin/uploads/image] storage failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const url = publicStorageUrl(key);

  await recordAudit({
    actor: organiser.userId,
    action: "content.upload",
    target: key,
  });

  return Response.json({ url });
}
