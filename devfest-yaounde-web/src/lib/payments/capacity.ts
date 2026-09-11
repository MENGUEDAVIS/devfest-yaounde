/**
 * The overall event capacity, and how many tickets are left against it.
 *
 * Shared by the tickets page (server-rendered initial value) and
 * `GET /api/tickets/capacity` (what `CapacityCounter` polls afterwards) so
 * the counting logic exists exactly once. `total` is the admin-set figure in
 * settings, independent of any tier's `quantityAvailable` — see the
 * capacity-vs-tier-caps ADR. `remaining` is sourced from a real count of
 * issued tickets, never a client guess.
 */
import "server-only";
import { loadSettings } from "@/lib/content/settings";
import { createAdminSupabase } from "@/lib/supabase/server";

export interface TicketCapacity {
  total: number | null;
  remaining: number | null;
}

export async function getTicketCapacity(): Promise<TicketCapacity> {
  const settings = await loadSettings();
  const total = settings.capacity.total;
  if (total == null) return { total: null, remaining: null };

  try {
    const db = createAdminSupabase();
    const { count, error } = await db
      .from("tickets")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return { total, remaining: Math.max(0, total - (count ?? 0)) };
  } catch (err) {
    console.warn("[capacity] issued-ticket count failed", err);
    // A public counter that goes down is more confusing than one that is
    // briefly stale — hold the last-known shape rather than error the page.
    return { total, remaining: total };
  }
}
