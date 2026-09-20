/**
 * Promote / demote admins (PHASE23 §E) — the pure half.
 *
 * Everything that DECIDES is in Postgres (`set_organiser_role`, migration
 * 0026): the last-admin rule, the actor re-check, the audit row. This file is
 * the vocabulary the route and the screen share — what the function can say,
 * what HTTP status each answer becomes, and the one check the route makes
 * itself (that the typed confirmation names the person). It has no imports
 * that touch the network, so it is unit-tested directly.
 */

export type RoleAction = "promote" | "demote";

/** Every string `set_organiser_role` can return. */
export const ROLE_RESULTS = [
  "promoted",
  "demoted",
  "already_admin",
  "not_admin",
  "last_admin",
  "self_confirmation_required",
  "actor_not_admin",
  "target_not_found",
] as const;
export type RoleResult = (typeof ROLE_RESULTS)[number];

export function isRoleResult(value: unknown): value is RoleResult {
  return (
    typeof value === "string" &&
    (ROLE_RESULTS as readonly string[]).includes(value)
  );
}

/** Codes the route returns that the function does not — the route's own refusals. */
export const ROLE_ERRORS = {
  FORBIDDEN: "forbidden",
  CROSS_ORIGIN: "cross_origin",
  RATE_LIMITED: "rate_limited",
  INVALID_BODY: "invalid_body",
  CONFIRMATION_MISMATCH: "confirmation_mismatch",
  SERVER_ERROR: "server_error",
} as const;
export type RoleErrorCode =
  | (typeof ROLE_ERRORS)[keyof typeof ROLE_ERRORS]
  | Exclude<RoleResult, "promoted" | "demoted">;

/**
 * What each verdict looks like over HTTP.
 *
 * `promoted` / `demoted` are the only two that changed anything. The two
 * idempotent ones (`already_admin`, `not_admin`) are 200 with `changed:false`
 * rather than errors — the person asked for a state and it is already true —
 * so a double-click or a retry after a timeout is harmless.
 */
export const ROLE_HTTP: Record<
  RoleResult,
  { status: number; changed: boolean; error?: RoleErrorCode }
> = {
  promoted: { status: 200, changed: true },
  demoted: { status: 200, changed: true },
  already_admin: { status: 200, changed: false },
  not_admin: { status: 200, changed: false },
  last_admin: { status: 409, changed: false, error: "last_admin" },
  self_confirmation_required: {
    status: 409,
    changed: false,
    error: "self_confirmation_required",
  },
  actor_not_admin: { status: 403, changed: false, error: "actor_not_admin" },
  target_not_found: { status: 404, changed: false, error: "target_not_found" },
};

/**
 * Does what was typed name this account?
 *
 * The screen makes somebody type the target's email before the button
 * enables; the SERVER repeats the check against the real account, because a
 * direct request skips the screen. Case-insensitive and trimmed (email
 * addresses are compared that way in practice), but otherwise exact: no
 * prefix match, no partial match. An account with no email can never be
 * confirmed — there is nothing to type — so it can never be changed here.
 */
export function confirmationMatches(
  typed: string,
  targetEmail: string | null | undefined,
): boolean {
  const want = targetEmail?.trim().toLowerCase();
  if (!want) return false;
  return typed.trim().toLowerCase() === want;
}

/** Same-origin check for a state-changing request. */
export function isSameOrigin(
  origin: string | null,
  host: string | null,
): boolean {
  // A browser always sends Origin on a cross-site POST. A request with none
  // is a non-browser client (curl, a server) — it has no ambient cookie to
  // abuse, and it is still fully authenticated and authorised below.
  if (origin === null) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
