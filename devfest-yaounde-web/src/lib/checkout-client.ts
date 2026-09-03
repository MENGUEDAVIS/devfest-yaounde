"use client";

/**
 * The browser's side of checkout.
 *
 * Two rules from `docs/guides/frontend-integration.md` are enforced by this
 * module's SHAPE, not by remembering them at each call site:
 *
 *  1. **No price is ever sent.** There is no field for one in these types.
 *     Totals are recomputed server-side from the catalog by id; a `priceXAF`
 *     in a request body is ignored. Prices shown in the UI come from the same
 *     JSON, but what is charged comes from the server's `quote`.
 *  2. **Errors are codes, not sentences.** `CheckoutError.code` maps through
 *     `errors.checkout.*`, which is already bilingual, so no server string is
 *     ever rendered.
 */

export interface AttendeeInput {
  tierId: string;
  name: string;
  email: string;
  apparelSize?: string;
}

export interface CheckoutContact {
  email: string;
  /** `237XXXXXXXXX` — no plus, no spaces. Optional; PawaPay asks if absent. */
  phone?: string;
}

export interface QuoteLine {
  label?: string;
  description?: string;
  quantity?: number;
  amount?: number;
}

export interface CheckoutResult {
  depositId: string;
  redirectUrl?: string;
  fulfilled: boolean;
  charged: number;
  currency: string;
  quote?: {
    lines?: QuoteLine[];
    subtotal?: number;
    discountAmount?: number;
    charged?: number;
  };
}

/** A server-rejected checkout. `code` is what the UI translates. */
export class CheckoutError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter?: number;

  constructor(code: string, status: number, retryAfter?: number) {
    super(code);
    this.name = "CheckoutError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function post(path: string, body: unknown): Promise<CheckoutResult> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // The request never landed, so nothing was charged. Distinct from a
    // server rejection, and worth its own message.
    throw new CheckoutError("network", 0);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CheckoutError(
      typeof payload.error === "string" ? payload.error : "server_error",
      res.status,
      typeof payload.retryAfter === "number" ? payload.retryAfter : undefined,
    );
  }
  return payload as CheckoutResult;
}

export function checkoutTickets(input: {
  attendees: AttendeeInput[];
  /**
   * The refund acknowledgment. Required by the server, which records WHEN it
   * was accepted and the exact wording it showed — see ADR 0022. The literal
   * type means a call site cannot forget it or pass `false`.
   */
  acceptedTerms: true;
  discountCode?: string;
  contact: CheckoutContact;
  locale: string;
}) {
  return post("/api/checkout/tickets", input);
}

export function checkoutShop(input: {
  cart: {
    productId: string;
    quantity: number;
    variant?: Record<string, string>;
  }[];
  /** As for tickets — goods carry their own wording, recorded server-side. */
  acceptedTerms: true;
  discountCode?: string;
  contact: CheckoutContact;
  locale: string;
}) {
  return post("/api/checkout/shop", input);
}

/**
 * Where to go once the server has accepted an order.
 *
 * Both branches end on the SAME confirmation screen, which is the point: a
 * free ticket and a paid one are identical at the door, so they should look
 * identical here too. A paid order detours through PawaPay first.
 */
export function nextStepAfterCheckout(
  result: CheckoutResult,
  locale: string,
): string {
  if (result.redirectUrl) return result.redirectUrl;
  return `/${locale}/payments/return?depositId=${encodeURIComponent(result.depositId)}`;
}
