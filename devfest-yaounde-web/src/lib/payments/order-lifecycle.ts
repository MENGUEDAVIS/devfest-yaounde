/**
 * Shop order lifecycle.
 *
 * `PAGES.md` §11 leaves pickup-vs-shipping genuinely undecided, so this does
 * not model a delivery pipeline. It models the one thing that is certain: an
 * order moves forward through a small set of states, and only forward.
 *
 * The transition table is the whole point. Without it, a mis-tapped button in
 * a back office can silently move a shipped order back to "processing" and
 * nobody notices until a customer asks.
 */
import "server-only";

export const ORDER_STATUSES = [
  "processing",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * What may follow what. `delivered` and `cancelled` are terminal: undoing one
 * is a real-world event (a refund, a return) that deserves its own record,
 * not a quiet status flip.
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  processing: ["ready_for_pickup", "shipped", "cancelled"],
  ready_for_pickup: ["delivered", "shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}
