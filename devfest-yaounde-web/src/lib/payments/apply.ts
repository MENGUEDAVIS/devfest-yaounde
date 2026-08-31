/**
 * The single point where a payment turns into tickets or an order.
 *
 * Both the callback and the free-tier checkout funnel through here, so there
 * is exactly one definition of "deliver this", and it is idempotent. A poll
 * racing a callback, or PawaPay replaying a callback, cannot double-deliver.
 *
 * Order of operations, and why:
 *   1. Re-fetch the deposit from PawaPay. The callback body is a nudge, not
 *      evidence — believing it is how you get charged 1 XAF for a hoodie.
 *   2. Load the persisted intent. That is what we expect to be paid.
 *   3. Compare amount AND currency. A currency-only match is not a match.
 *   4. Deliver and flip the status in ONE transaction (the SQL function), so
 *      there is no crash window between "tickets exist" and "marked paid".
 */
import "server-only";
import {
  PawaPayError,
  checkDepositStatus,
  type DepositRecord,
} from "@/lib/pawapay/client";
import { badgeCodesFor } from "@/lib/security/badge-code";
import { createAdminSupabase } from "@/lib/supabase/server";
import { sendReceipt } from "./notify";
import {
  countEvents,
  getPaymentIntent,
  logPaymentEvent,
  markAmountMismatch,
  markFailed,
  type PaymentIntentRow,
} from "./intents";

export type ApplyOutcome =
  | "applied"
  | "already_applied"
  | "not_completed"
  | "failed"
  | "amount_mismatch"
  | "unknown_deposit";

/**
 * Thrown for problems that MIGHT resolve on their own — PawaPay unreachable,
 * the intent not written yet. The callback route turns this into a 5xx so
 * PawaPay replays it.
 */
export class TransientPaymentError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TransientPaymentError";
  }
}

/**
 * How many "we have no intent for this" retries to allow before concluding
 * the deposit belongs to another application on the same PawaPay account.
 * PawaPay retries for about 15 minutes, so this stops well inside that.
 */
const FOREIGN_DEPOSIT_ATTEMPTS = 4;

/** PawaPay states that will never become COMPLETED. */
const TERMINAL_FAILURES = new Set(["FAILED", "REJECTED", "CANCELLED"]);

function depositAmount(deposit: DepositRecord): number {
  const raw = deposit.amount ?? deposit.depositedAmount;
  return Number(raw);
}

/**
 * Runs delivery inside Postgres. The function claims the intent with
 * `FOR UPDATE` and a `status = 'pending'` guard, so concurrent callers
 * serialise and only the first one delivers.
 */
async function deliver(intent: PaymentIntentRow): Promise<ApplyOutcome> {
  const supabase = createAdminSupabase();

  const badgeCodes =
    intent.kind === "tickets"
      ? badgeCodesFor(intent.deposit_id, intent.attendees?.length ?? 0)
      : undefined;

  const { data, error } = await supabase.rpc("apply_paid_deposit", {
    p_deposit_id: intent.deposit_id,
    p_badge_codes: badgeCodes,
  });

  if (error) {
    // Could be a transient connection failure — let PawaPay try again.
    throw new TransientPaymentError(
      `fulfilment failed for ${intent.deposit_id}: ${error.message}`,
      error,
    );
  }

  const result = String(data) as "applied" | "already_applied" | "not_found";
  if (result === "not_found") return "unknown_deposit";
  return result;
}

/**
 * The full guarded path, driven by a deposit id alone.
 *
 * @throws TransientPaymentError when the caller should retry later.
 */
export async function applyDepositIfCompleted(
  depositId: string,
): Promise<ApplyOutcome> {
  let lookup;
  try {
    lookup = await checkDepositStatus(depositId);
  } catch (err) {
    if (err instanceof PawaPayError && !err.transient) {
      // A 4xx from PawaPay about this deposit will not fix itself.
      await logPaymentEvent(depositId, "lookup_rejected", {
        message: err.message,
      });
      return "unknown_deposit";
    }
    throw new TransientPaymentError(
      `could not reach PawaPay for ${depositId}`,
      err,
    );
  }

  const deposit = lookup.data;
  if (!deposit) {
    // NOT_FOUND right after a callback usually means propagation lag.
    throw new TransientPaymentError(`deposit ${depositId} not found yet`);
  }

  if (TERMINAL_FAILURES.has(deposit.status)) {
    await markFailed(
      depositId,
      deposit.failureReason?.failureCode ?? deposit.status,
    );
    return "failed";
  }

  if (deposit.status !== "COMPLETED") {
    // PENDING / SUBMITTED / ACCEPTED — nothing owed yet, and no retry needed:
    // PawaPay will call again when it settles.
    return "not_completed";
  }

  const intent = await getPaymentIntent(depositId);
  if (!intent) {
    // Two very different situations look identical here.
    //
    //   1. The callback beat our own insert. Retrying fixes it, and that is
    //      the common case — hence the transient error.
    //   2. The deposit belongs to a DIFFERENT application sharing this
    //      PawaPay account. Retrying will never fix that, and answering 5xx
    //      forever makes us a permanently failing endpoint in their console.
    //
    // Telling them apart by counting: a real race resolves within a retry or
    // two. Past that, it is not ours.
    const attempts = await countEvents(
      depositId,
      "intent_missing_for_completed_deposit",
    );

    if (attempts >= FOREIGN_DEPOSIT_ATTEMPTS) {
      await logPaymentEvent(depositId, "foreign_deposit_ignored", { attempts });
      console.warn(
        "[payments] deposit is not ours after repeated retries, acknowledging",
        { depositId, attempts },
      );
      // 200, so PawaPay stops. The audit trail keeps the evidence.
      return "unknown_deposit";
    }

    await logPaymentEvent(depositId, "intent_missing_for_completed_deposit");
    throw new TransientPaymentError(
      `no intent stored for paid deposit ${depositId}`,
    );
  }

  if (intent.status !== "pending") {
    return intent.status === "activated" ? "already_applied" : "not_completed";
  }

  const paid = depositAmount(deposit);
  const paidCurrency = (deposit.currency ?? "").toUpperCase();

  if (
    !Number.isFinite(paid) ||
    paidCurrency !== intent.currency.toUpperCase() ||
    paid !== intent.charged_amount
  ) {
    // Terminal on purpose. Retrying cannot make the numbers agree, and this
    // needs a person: refund, or manual fulfilment after reconciliation.
    await markAmountMismatch(depositId, {
      expected: intent.charged_amount,
      expectedCurrency: intent.currency,
      received: Number.isFinite(paid) ? paid : null,
      receivedCurrency: paidCurrency || null,
    });
    console.error("[payments] MANUAL_REVIEW_REQUIRED amount mismatch", {
      depositId,
    });
    return "amount_mismatch";
  }

  const outcome = await deliver(intent);
  await logPaymentEvent(depositId, `apply_${outcome}`, { kind: intent.kind });

  // Only on a FRESH delivery: `already_applied` means a replayed callback,
  // and the attendee already has their receipt.
  if (outcome === "applied") await sendReceipt(intent);

  return outcome;
}

/**
 * Free tier (Haikyu, 0 XAF). PawaPay cannot process a zero-amount deposit, so
 * a free ticket never leaves our side — but it still goes through the same
 * intent + fulfilment path so "my tickets" and check-in behave identically.
 *
 * ADR 0008 made this load-bearing: with the Bevy RSVP retired, a free ticket
 * is now the only way to say "I'm coming" without paying.
 */
export async function fulfilFreeIntent(
  depositId: string,
): Promise<ApplyOutcome> {
  const intent = await getPaymentIntent(depositId);
  if (!intent) return "unknown_deposit";
  if (intent.charged_amount !== 0) {
    throw new Error(
      `refusing to fulfil ${depositId} for free: it is charged ${intent.charged_amount}`,
    );
  }
  if (intent.status !== "pending") {
    return intent.status === "activated" ? "already_applied" : "not_completed";
  }

  const outcome = await deliver(intent);
  await logPaymentEvent(depositId, `apply_free_${outcome}`, {
    kind: intent.kind,
  });

  // A free ticket still gets its badge code by email — it is the only thing
  // the attendee brings to the door.
  if (outcome === "applied") await sendReceipt(intent);

  return outcome;
}
