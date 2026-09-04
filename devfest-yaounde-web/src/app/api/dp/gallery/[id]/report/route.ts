/**
 * POST /api/dp/gallery/:id/report — a visitor flags a live card.
 *
 * No account (ADR 0015). Rate-limited by IP. A second report from the same
 * address for the same card is a no-op that still looks like success, so the
 * endpoint cannot be used to discover which ids exist.
 *
 * G21 / ADR 0033.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/pawapay/verify";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

function enabled(): boolean {
  return process.env.NEXT_PUBLIC_DP_GALLERY === "1";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!enabled()) {
    return Response.json({ error: "gallery_disabled" }, { status: 404 });
  }

  const ip = clientIp(request.headers) ?? "unknown";
  const limit = await rateLimit(RATE_LIMITS.dpGalleryReport, `ip:${ip}`);
  if (!limit.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createAdminSupabase();
  const { data: card } = await supabase
    .from("dp_cards")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  // Missing, pending and rejected all answer the same way. The wall only
  // ever handed out approved ids; anything else is probing.
  if (!card || card.status !== "approved") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabase.from("dp_card_reports").insert({
    card_id: id,
    reporter_ip: ip === "unknown" ? null : ip,
  });

  if (error && error.code !== "23505") {
    console.error("[dp-gallery] report failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ reported: true }, { status: 201 });
}
