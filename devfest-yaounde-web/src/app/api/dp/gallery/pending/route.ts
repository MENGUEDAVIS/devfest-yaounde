/**
 * GET /api/dp/gallery/pending — the review queue.
 *
 * Organiser only. This is the whole moderation surface: list what is waiting,
 * look at it, then approve or reject through
 * `PATCH /api/dp/gallery/:id`.
 *
 * There is no screen for it. That is deliberate rather than unfinished — the
 * queue can be worked from any HTTP client, and building an interface before
 * anyone has submitted a card would be guessing at what the reviewer needs.
 * What matters is that approval is possible at all, so the flag can be turned
 * on without cards going public unseen.
 *
 * Two instructions for whoever reviews, from the contract:
 *   - reject deletes the image, it does not merely hide it;
 *   - do not publish cards of children. The generator asks nobody's age and
 *     should not start, so this is a judgement call, not a filter.
 */
import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { currentOrganiser } from "@/lib/security/organisers";
import { signedUrl } from "@/lib/dp/gallery-server";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DP_GALLERY !== "1") {
    return Response.json({ error: "gallery_disabled" }, { status: 404 });
  }

  const organiser = await currentOrganiser();
  if (!organiser) return Response.json({ error: "forbidden" }, { status: 403 });

  const page = Math.max(
    0,
    Number(request.nextUrl.searchParams.get("page") ?? 0) || 0,
  );

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("dp_cards")
    .select(
      "id, nickname, locale, storage_path, consent_at, consent_text, created_at",
    )
    .eq("status", "pending")
    // Oldest first: a queue, not a feed. Nobody should wait behind a rush.
    .order("created_at", { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (error) {
    console.error("[dp-gallery] queue read failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  const rows = data ?? [];
  const cards = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      nickname: row.nickname,
      locale: row.locale,
      // The reviewer sees what was agreed to, not just the picture.
      consentAt: row.consent_at,
      consentText: row.consent_text,
      submittedAt: row.created_at,
      imageUrl: await signedUrl(row.storage_path),
    })),
  );

  return Response.json({ cards, page, hasMore: rows.length === PAGE_SIZE });
}
