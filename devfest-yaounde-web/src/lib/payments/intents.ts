/**
 * Payment intents — persistence.
 *
 * The intent is written BEFORE the buyer is redirected to PawaPay. It is the
 * record of what we expect to be paid and what we owe once it is. Everything
 * downstream reads it; nothing downstream trusts PawaPay's echo of it.
 */
import "server-only";
import type { AttendeeInput, PricedBasket } from "@/data/types";
import { createAdminSupabase } from "@/lib/supabase/server";
import { toJson } from "@/lib/supabase/json";
import { RESERVATION_WINDOW_SECONDS, tierCapacities } from "./catalog";

export type PaymentKind = "tickets" | "shop";
export type PaymentStatus =
  "pending" | "activated" | "amount_mismatch" | "failed";

export interface PaymentIntentRow {
  deposit_id: string;
  user_id: string;
  kind: PaymentKind;
  status: PaymentStatus;
  charged_amount: number;
  net_amount: number;
  currency: string;
  discount_code: string | null;
  discount_amount: number;
  line_items: PricedBasket["lines"];
  attendees: AttendeeInput[] | null;
  contact: { email: string; phone?: string };
  locale: string;
  failure_code: string | null;
  terms_text: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  activated_at: string | null;
}

export interface CreateIntentInput {
  depositId: string;
  userId: string;
  kind: PaymentKind;
  quote: PricedBasket;
  attendees?: AttendeeInput[];
  contact: { email: string; phone?: string };
  locale: string;
  /** The exact acknowledgment wording, resolved server-side. */
  termsText: string;
}

/**
 * 'created', or a refusal that has to reach the buyer as a specific reason.
 * `sold_out:<tierId>` names the tier so the screen can point at the right card.
 */
export type CreateIntentOutcome =
  | { status: "created" }
  | { status: "sold_out"; tierId: string }
  | { status: "discount_exhausted" };

/**
 * Writes the intent through `create_payment_intent`, which reserves tier
 * capacity and the discount redemption in the SAME transaction as the insert.
 *
 * This is not a stylistic preference. Counting seats here in TypeScript and
 * inserting afterwards leaves a window where two buyers both read the last
 * seat as free and both get it — the check and the insert have to be atomic,
 * and only the database can make them so.
 */
export async function createPaymentIntent(
  input: CreateIntentInput,
): Promise<CreateIntentOutcome> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc("create_payment_intent", {
    p_deposit_id: input.depositId,
    p_user_id: input.userId,
    p_kind: input.kind,
    p_charged_amount: input.quote.charged,
    p_net_amount: input.quote.net,
    p_currency: input.quote.currency,
    // Empty string, not undefined: the SQL parameter is required, and the
    // function reads "" and NULL the same way (migration 0003).
    p_discount_code: input.quote.discountCode ?? "",
    p_discount_amount: input.quote.discountAmount,
    p_line_items: toJson(input.quote.lines),
    p_attendees: toJson(input.attendees ?? null),
    p_contact: toJson(input.contact),
    p_locale: input.locale,
    p_tier_capacities: toJson(tierCapacities()),
    p_reservation_window: RESERVATION_WINDOW_SECONDS,
    p_terms_text: input.termsText,
  });

  if (error) {
    throw new Error(`could not persist payment intent: ${error.message}`);
  }

  const result = String(data);
  if (result === "created") return { status: "created" };
  if (result === "discount_exhausted") return { status: "discount_exhausted" };
  if (result.startsWith("sold_out:")) {
    return { status: "sold_out", tierId: result.slice("sold_out:".length) };
  }
  throw new Error(`unexpected create_payment_intent result: ${result}`);
}

export async function getPaymentIntent(
  depositId: string,
): Promise<PaymentIntentRow | null> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("*")
    .eq("deposit_id", depositId)
    .maybeSingle<PaymentIntentRow>();

  if (error) throw new Error(`could not read payment intent: ${error.message}`);
  return data;
}

/**
 * Terminal state for "they paid, but not what we asked for". Deliberately
 * NOT retried: a mismatch is a human problem (refund, reconciliation), and
 * replaying the callback forever would only bury it.
 */
export async function markAmountMismatch(
  depositId: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminSupabase();
  await supabase
    .from("payment_intents")
    .update({ status: "amount_mismatch", updated_at: new Date().toISOString() })
    .eq("deposit_id", depositId)
    .eq("status", "pending");

  await logPaymentEvent(depositId, "amount_mismatch", detail);
}

export async function markFailed(
  depositId: string,
  failureCode: string | null,
): Promise<void> {
  const supabase = createAdminSupabase();
  await supabase
    .from("payment_intents")
    .update({
      status: "failed",
      failure_code: failureCode,
      updated_at: new Date().toISOString(),
    })
    .eq("deposit_id", depositId)
    .eq("status", "pending");

  await logPaymentEvent(depositId, "failed", { failureCode });
}

/**
 * A09 audit trail. Ids, states and failure codes — never attendee PII, never
 * anything resembling a credential.
 */
export async function logPaymentEvent(
  depositId: string | null,
  event: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createAdminSupabase();
    await supabase
      .from("payment_events")
      .insert({ deposit_id: depositId, event, detail: toJson(detail ?? {}) });
  } catch (err) {
    // Losing an audit line must never fail a payment.
    console.warn("[payments] could not write audit event", event, err);
  }
}

/** How many times a given event has been recorded for a deposit. */
export async function countEvents(
  depositId: string,
  event: string,
): Promise<number> {
  try {
    const supabase = createAdminSupabase();
    const { count, error } = await supabase
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("deposit_id", depositId)
      .eq("event", event);

    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    // Losing the count must not change the payment outcome: report zero, so
    // the caller keeps retrying rather than giving up on a real payment.
    console.warn("[payments] could not count events", event, err);
    return 0;
  }
}
