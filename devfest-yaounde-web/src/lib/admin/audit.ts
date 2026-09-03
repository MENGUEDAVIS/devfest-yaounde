/**
 * Organiser audit log (G22).
 *
 * Every privileged write should call this after it succeeds. Failures are
 * logged and swallowed: an audit outage must not undo a check-in or a
 * published speaker list. The row is the evidence; losing one is worse than
 * blocking the action, but losing the action because the log was down is
 * worse still at a door.
 */
import "server-only";
import { createAdminSupabase } from "@/lib/supabase/server";
import { toJson } from "@/lib/supabase/json";

export async function recordAudit(input: {
  actor: string;
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const db = createAdminSupabase();
    const { error } = await db.from("admin_audit").insert({
      actor: input.actor,
      action: input.action,
      target: input.target ?? null,
      before: input.before === undefined ? null : toJson(input.before),
      after: input.after === undefined ? null : toJson(input.after),
    });
    if (error) {
      console.error("[audit] write failed", error.message);
    }
  } catch (err) {
    console.error("[audit] unavailable", err);
  }
}
