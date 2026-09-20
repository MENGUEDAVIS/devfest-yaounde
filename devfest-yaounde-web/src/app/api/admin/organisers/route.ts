/**
 * POST /api/admin/organisers — promote a user to admin, or remove an admin.
 *
 * A privilege-escalation surface. The logic is in
 * `@/lib/admin/organiser-role-handler` (documented order of checks) and the
 * rules that cannot be bypassed are in Postgres (`set_organiser_role`,
 * migration 0026). This file only wires in the real collaborators.
 */
import { NextRequest } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { handleRoleChange } from "@/lib/admin/organiser-role-handler";
import { currentOrganiser } from "@/lib/security/organisers";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  return handleRoleChange(request, {
    currentOrganiser,
    rateLimit: (userId) =>
      rateLimit(RATE_LIMITS.adminRoleChange, `user:${userId}`),
    async getTarget(userId) {
      const { data, error } =
        await createAdminSupabase().auth.admin.getUserById(userId);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async setRole({ actor, target, action, confirmSelf }) {
      const { data, error } = await createAdminSupabase().rpc(
        "set_organiser_role",
        {
          p_actor: actor,
          p_target: target,
          p_action: action,
          p_confirm_self: confirmSelf,
        },
      );
      if (error) {
        console.error("[admin/organisers] rpc error", error.message);
        return null;
      }
      return typeof data === "string" ? data : null;
    },
    recordAudit,
    log: { warn: console.warn, error: console.error },
  });
}
