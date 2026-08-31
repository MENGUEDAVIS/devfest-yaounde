/**
 * GET /api/account/tickets — the "My Tickets" dashboard feed (PAGES.md §7).
 *
 * A01 is enforced twice on purpose: the query runs through the SESSION client
 * (so RLS filters to `auth.uid()`), and there is no id parameter to tamper
 * with in the first place. Changing a number in the URL gets you nowhere
 * because there is no number in the URL.
 */
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { createServerSupabase, currentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();
  if (!user) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, tier_id, attendee_name, attendee_email, apparel_size, badge_code, checked_in_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[account/tickets] query failed", error);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  return Response.json({ tickets: data ?? [] });
}
