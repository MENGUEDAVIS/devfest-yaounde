/**
 * POST /api/admin/organisers — the request handler, with its collaborators
 * passed in (PHASE23 §E).
 *
 * It lives here rather than in the route file for two reasons: Next only
 * allows a route module to export HTTP handlers, and this is the one place
 * the whole request path is testable end to end. The route file is a
 * one-line wiring of the REAL collaborators; the tests wire fakes — including
 * a fake that runs the real `set_organiser_role` SQL in a real Postgres
 * engine — into the very same function.
 *
 * ORDER OF CHECKS, and why it is this order:
 *   1. same-origin + JSON        — before anything reads a session
 *   2. is the caller an admin    — 403, nothing else is revealed
 *   3. rate limit                — a stolen session cannot churn membership
 *   4. body shape                — zod, strict
 *   5. does the target exist     — 404
 *   6. does the typed email name them — the double-confirmation, server-side
 *   7. the database function     — the last-admin rule, the actor re-check and
 *      the audit row all happen there, atomically. Nothing above can weaken
 *      them and nothing here can skip them.
 */
import { z } from "zod";
import {
  ROLE_ERRORS,
  ROLE_HTTP,
  confirmationMatches,
  isRoleResult,
  isSameOrigin,
  type RoleAction,
  type RoleErrorCode,
} from "./organiser-roles";

/** The Nth change in one window is worth a flag on its own (see below). */
export const BURST_FLAG_AT = 5;

export interface RoleChangeDeps {
  currentOrganiser(): Promise<{ userId: string; email: string | null } | null>;
  /** Counts this call against the caller's window. */
  rateLimit(
    userId: string,
  ): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }>;
  getTarget(
    userId: string,
  ): Promise<{ id: string; email: string | null } | null>;
  /** Runs `set_organiser_role`. Returns its verdict, or null if the call failed. */
  setRole(args: {
    actor: string;
    target: string;
    action: RoleAction;
    confirmSelf: boolean;
  }): Promise<string | null>;
  /** Best-effort record, for things the database function does not itself audit. */
  recordAudit(entry: {
    actor: string;
    action: string;
    target?: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void>;
  log: {
    warn(message: string, detail?: unknown): void;
    error(message: string, detail?: unknown): void;
  };
}

const bodySchema = z
  .object({
    userId: z.string().uuid(),
    action: z.enum(["promote", "demote"]),
    /** The target's email, typed by the person — checked against the account. */
    confirmEmail: z.string().min(3).max(320),
    /** Required, and only honoured, when the target is the caller themself. */
    confirmSelf: z.boolean().optional(),
  })
  .strict();

function fail(
  error: RoleErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error, ...extra }, { status });
}

export async function handleRoleChange(
  request: Request,
  deps: RoleChangeDeps,
): Promise<Response> {
  // 1. A state-changing request from another site, or not JSON, never gets as
  //    far as a session lookup.
  if (
    !isSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  ) {
    return fail(ROLE_ERRORS.CROSS_ORIGIN, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(ROLE_ERRORS.INVALID_BODY, 400);
  }

  // 2. Only an existing admin.
  const actor = await deps.currentOrganiser();
  if (!actor) return fail(ROLE_ERRORS.FORBIDDEN, 403);

  // 3. Rate limit, keyed to the person rather than the address. Ten changes
  //    in ten minutes is far more than any real reshuffle of a small team;
  //    a script or a stolen session churning membership is what it fences.
  const limit = await deps.rateLimit(actor.userId);
  if (!limit.allowed) {
    deps.log.warn("[admin/organisers] role-change rate limit hit", {
      actor: actor.userId,
      count: limit.count,
    });
    return fail(ROLE_ERRORS.RATE_LIMITED, 429, {
      retryAfter: limit.retryAfterSeconds,
    });
  }
  // Monitoring, not just fencing: the Nth change inside one window is flagged
  // once, in the log AND in the audit trail, so a burst is visible later even
  // though every individual change was allowed.
  if (limit.count === BURST_FLAG_AT) {
    deps.log.warn("[admin/organisers] rapid role changes", {
      actor: actor.userId,
      count: limit.count,
    });
    await deps.recordAudit({
      actor: actor.userId,
      action: "organiser.rapid_changes",
      after: { changesInWindow: limit.count },
    });
  }

  // 4. Shape.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(ROLE_ERRORS.INVALID_BODY, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return fail(ROLE_ERRORS.INVALID_BODY, 400);
  const body = parsed.data;

  // 5. The target has to be a real account.
  const target = await deps.getTarget(body.userId);
  if (!target) return fail("target_not_found", 404);

  // 6. The double-confirmation, enforced HERE and not only on the screen.
  if (!confirmationMatches(body.confirmEmail, target.email)) {
    await deps.recordAudit({
      actor: actor.userId,
      action: "organiser.change_refused",
      target: target.id,
      before: { attempted: body.action },
      after: { reason: "confirmation_mismatch" },
    });
    return fail(ROLE_ERRORS.CONFIRMATION_MISMATCH, 400);
  }

  // 7. The database decides.
  const verdict = await deps.setRole({
    actor: actor.userId,
    target: target.id,
    action: body.action,
    confirmSelf: body.confirmSelf === true,
  });
  if (!isRoleResult(verdict)) {
    // The RPC is missing (migration 0026 not applied yet), the database is
    // down, or it said something we do not understand. Fail CLOSED.
    deps.log.error("[admin/organisers] set_organiser_role failed", { verdict });
    return fail(ROLE_ERRORS.SERVER_ERROR, 500);
  }

  const http = ROLE_HTTP[verdict];
  if (http.error) return fail(http.error, http.status, { result: verdict });
  return Response.json(
    { result: verdict, changed: http.changed },
    { status: http.status },
  );
}
