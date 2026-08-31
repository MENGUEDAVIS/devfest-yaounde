/**
 * Organiser authorisation.
 *
 * Two things need it: scanning a badge at the door, and moving a shop order
 * along. Both are privileged reads/writes over OTHER people's data, so they
 * get their own check rather than riding on "is signed in".
 *
 * Membership is a row in `organisers`, added by hand in the Supabase
 * dashboard — adding a volunteer on the morning of the event should be one
 * row, not a re-deploy. See docs/guides/check-in-and-orders.md.
 */
import "server-only";
import { createAdminSupabase, currentUser } from "@/lib/supabase/server";

export interface OrganiserContext {
  userId: string;
  email: string | null;
}

/**
 * Resolves the caller to an organiser, or null.
 *
 * The membership lookup runs through the service role deliberately: the
 * `organisers` table is only readable by organisers, so a non-organiser
 * asking "am I one?" through their own session would read an empty table and
 * get the same answer by accident rather than by check.
 */
export async function currentOrganiser(): Promise<OrganiserContext | null> {
  const user = await currentUser();
  if (!user) return null;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("organisers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Fail CLOSED. Unlike rate limiting, a database hiccup here must not hand
    // out check-in rights.
    console.error("[organisers] membership lookup failed", error.message);
    return null;
  }
  if (!data) return null;

  return { userId: user.id, email: user.email ?? null };
}
