/**
 * One card on the wall.
 *
 *   DELETE — takedown, by the person who submitted it. Header
 *            `X-Deletion-Token`. No account exists, so that token is the only
 *            proof of authorship there can be.
 *   PATCH  — moderation. Organiser only: approve or reject.
 *
 * Contract: docs/backend/dp-gallery-contract.md.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/admin/audit";
import { currentOrganiser } from "@/lib/security/organisers";
import { hashToken, removeCard, tokensMatch } from "@/lib/dp/gallery-server";

const idSchema = z.string().uuid();
const patchSchema = z
  .object({
    status: z.enum(["approved", "rejected"]).optional(),
    visible: z.boolean().optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.visible !== undefined,
    "empty patch",
  );

function enabled(): boolean {
  return process.env.NEXT_PUBLIC_DP_GALLERY === "1";
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!enabled()) {
    return Response.json({ error: "gallery_disabled" }, { status: 404 });
  }

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  /*
   * TWO ways to be allowed to delete a card, and they are not the same right.
   *
   *   - the submitter, proving it with the token they were handed once;
   *   - an ORGANISER, proving it with a session.
   *
   * The organiser path is new, and it is a bug fix rather than a feature.
   * There was no way for an organiser to delete anything: the admin's "trash"
   * button fell back to `PATCH { status: "rejected" }`, which removes the
   * image but LEAVES THE ROW. So a moderated card stayed in the admin list
   * for ever, now with a dead image — you could press delete on it four times
   * and it would still be sitting there. The card was never deleted because
   * nothing could delete it.
   */
  const token = request.headers.get("x-deletion-token");
  const organiser = token ? null : await currentOrganiser();
  if (!token && !organiser) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createAdminSupabase();
  const { data: card } = await supabase
    .from("dp_cards")
    .select("id, storage_path, deletion_hash, nickname")
    .eq("id", id)
    .maybeSingle();

  if (!card) return Response.json({ error: "not_found" }, { status: 404 });

  // A wrong token and a missing card answer identically, so the token path
  // cannot be used to discover which ids exist. An organiser is already
  // authenticated, so that property is not theirs to protect.
  if (token && !tokensMatch(hashToken(token), card.deletion_hash)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // The image goes first. A row without an object is untidy; an object
  // without a row is a face still being served.
  await removeCard(card.storage_path);
  const { error } = await supabase.from("dp_cards").delete().eq("id", id);

  if (error) {
    console.error("[dp-gallery] delete failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  // Only an organiser's deletion is audited: a takedown by the person in the
  // photograph is them exercising a right, not an action taken over them, and
  // logging who removed themselves would keep a record of exactly the person
  // who asked to stop having one.
  if (organiser) {
    await recordAudit({
      actor: organiser.userId,
      action: "wall.delete",
      target: id,
      before: { nickname: card.nickname },
      after: null,
    });
  }

  return Response.json({ deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!enabled()) {
    return Response.json({ error: "gallery_disabled" }, { status: 404 });
  }

  const organiser = await currentOrganiser();
  if (!organiser) return Response.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: card } = await supabase
    .from("dp_cards")
    .select("id, storage_path, status, visible")
    .eq("id", id)
    .maybeSingle();

  if (!card) return Response.json({ error: "not_found" }, { status: 404 });

  // Rejection DELETES the image rather than hiding it. A rejected face
  // sitting in a bucket is the harm the review existed to prevent.
  // `visible` is the reversible hide (ADR 0034 / B9).
  if (parsed.data.status === "rejected") {
    await removeCard(card.storage_path);
  }

  const { error } = await supabase
    .from("dp_cards")
    .update({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.visible !== undefined
        ? { visible: parsed.data.visible }
        : {}),
      reviewed_by: organiser.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[dp-gallery] moderation failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  await recordAudit({
    actor: organiser.userId,
    action: "wall.moderate",
    target: id,
    before: { status: card.status, visible: card.visible },
    after: {
      status: parsed.data.status ?? card.status,
      visible: parsed.data.visible ?? card.visible,
    },
  });

  return Response.json({
    id,
    status: parsed.data.status ?? card.status,
    visible: parsed.data.visible ?? card.visible,
  });
}
