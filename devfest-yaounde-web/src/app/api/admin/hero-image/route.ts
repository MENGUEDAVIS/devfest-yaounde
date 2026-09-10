/**
 * POST /api/admin/hero-image — replace the landing hero's backdrop.
 *
 * Its own route rather than a case inside `/api/admin/content/[id]/photo`,
 * because that endpoint attaches a photo to an ENTRY IN A COLLECTION: it takes
 * an `entryId`, finds the record, writes the URL onto it and saves the array.
 * The backdrop is a setting with none of those parts. Bending that route into
 * covering both would have made every one of its steps conditional.
 *
 * What it does share is everything that matters: the same organiser check, the
 * same rate limit, the same bucket, the same audit trail — and
 * `normaliseBackdrop`, which is the one deliberate difference (WebP, so
 * transparency survives; see the note on it).
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import {
  BACKDROP_PATH,
  normaliseBackdrop,
  PhotoRejected,
  publicBackdropUrl,
  storePhoto,
} from "@/lib/content/photos";
import { revalidateSettings } from "@/lib/content/revalidate";
import { loadSettings, saveSettings } from "@/lib/content/settings";
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  const file = form.get("image");
  if (!(file instanceof Blob)) {
    return errorResponse(CHECKOUT_ERRORS.INVALID_BODY, 400);
  }

  let bytes: Buffer;
  try {
    bytes = await normaliseBackdrop(file);
  } catch (err) {
    if (err instanceof PhotoRejected) {
      // The reason is the useful part — "too_large" and "not_an_image" need
      // different things from the person holding the file.
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("[admin/hero-image] normalise failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  try {
    await storePhoto(BACKDROP_PATH, bytes, "image/webp");
  } catch (err) {
    console.error("[admin/hero-image] storage failed", err);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  const before = await loadSettings();
  const url = publicBackdropUrl();
  /*
    Only `hero` is sent. `saveSettings` writes exactly the keys it is given
    (ADR 0038), so uploading a backdrop cannot blank the announcement or the
    call for speakers by omission.
  */
  const saved = await saveSettings(
    { hero: { imageUrl: url } },
    organiser.userId,
  );
  if (!saved.ok) return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);

  await recordAudit({
    actor: organiser.userId,
    action: "settings.hero_image",
    target: "site",
    before: { hero: before.hero },
    after: { hero: { imageUrl: url } },
  });

  // The home page is prerendered; without this the new backdrop is stored and
  // invisible (ADR 0042).
  revalidateSettings();

  return Response.json({ url });
}
