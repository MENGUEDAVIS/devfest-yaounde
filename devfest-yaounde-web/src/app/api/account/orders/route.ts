/**
 * GET /api/account/orders — the "My Orders" dashboard feed (PAGES.md §8).
 *
 * Same shape as the tickets feed: session client, RLS-filtered, no id in the
 * request to tamper with. Order items ride along through the nested select,
 * which is covered by its own RLS policy on `order_items`.
 */
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { createServerSupabase, currentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();
  if (!user) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, currency, fulfilment, created_at, order_items(product_id, variant, quantity, unit_amount, name_snapshot)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[account/orders] query failed", error);
    return errorResponse(CHECKOUT_ERRORS.SERVER_ERROR, 500);
  }

  return Response.json({ orders: data ?? [] });
}
