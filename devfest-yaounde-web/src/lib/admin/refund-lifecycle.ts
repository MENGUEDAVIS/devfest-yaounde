/**
 * Refund/exchange request lifecycle (PHASE22 §D).
 *
 * Same reasoning as `payments/order-lifecycle.ts`: the transition table is
 * the whole point. Without it, a mis-tapped button can silently move a
 * request organisers already answered back into the open queue, or "resolve"
 * one nobody has actually looked at yet.
 */
import "server-only";

export const REFUND_REQUEST_STATUSES = [
  "requested",
  "in_progress",
  "resolved",
  "denied",
] as const;

export type RefundRequestStatus = (typeof REFUND_REQUEST_STATUSES)[number];

/**
 * `resolved` is terminal — the refund or exchange actually happened, which
 * is a real-world event, not a status to flip back. `denied` can be
 * reconsidered (the requester provides more context) by moving it back to
 * active work, not straight back to a fresh "requested".
 */
const ALLOWED: Record<RefundRequestStatus, readonly RefundRequestStatus[]> = {
  requested: ["in_progress", "resolved", "denied"],
  in_progress: ["resolved", "denied", "requested"],
  resolved: [],
  denied: ["in_progress"],
};

export function canTransition(
  from: RefundRequestStatus,
  to: RefundRequestStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function isRefundRequestStatus(
  value: unknown,
): value is RefundRequestStatus {
  return (
    typeof value === "string" &&
    (REFUND_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}
