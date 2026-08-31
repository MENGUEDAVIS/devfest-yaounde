/**
 * GET /api/account/profile — who am I, and am I an organiser.
 *
 * The one call a shell needs to decide what to show. Read through the session
 * client, so RLS guarantees it can only ever be the caller's own row.
 */
import { CHECKOUT_ERRORS, errorResponse } from "@/lib/payments/errors";
import { currentOrganiser } from "@/lib/security/organisers";
import { createServerSupabase, currentUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();
  if (!user) return errorResponse(CHECKOUT_ERRORS.UNAUTHENTICATED, 401);

  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const organiser = await currentOrganiser();

  return Response.json({
    // Fall back to the auth record: the profiles trigger fires on sign-up, so
    // an account created before it existed would otherwise look empty.
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isOrganiser: organiser !== null,
  });
}
