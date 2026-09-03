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
import { currentOrganiser } from "@/lib/security/organisers";
import { hashToken, removeCard, tokensMatch } from "@/lib/dp/gallery-server";

const idSchema = z.string().uuid();
const patchSchema = z.object({ status: z.enum(["approved", "rejected"]) });

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

  const token = request.headers.get("x-deletion-token");
  if (!token) return Response.json({ error: "not_found" }, { status: 404 });

  const supabase = createAdminSupabase();
  const { data: card } = await supabase
    .from("dp_cards")
    .select("id, storage_path, deletion_hash")
    .eq("id", id)
    .maybeSingle();

  // A wrong token and a missing card answer identically, so this cannot be
  // used to discover which ids exist.
  if (!card || !tokensMatch(hashToken(token), card.deletion_hash)) {
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
    .select("id, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!card) return Response.json({ error: "not_found" }, { status: 404 });

  // Rejection DELETES the image rather than hiding it. A rejected face
  // sitting in a bucket is the harm the review existed to prevent.
  if (parsed.data.status === "rejected") {
    await removeCard(card.storage_path);
  }

  const { error } = await supabase
    .from("dp_cards")
    .update({
      status: parsed.data.status,
      reviewed_by: organiser.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[dp-gallery] moderation failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ id, status: parsed.data.status });
}
