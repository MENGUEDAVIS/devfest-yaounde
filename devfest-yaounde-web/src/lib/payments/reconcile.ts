/**
 * Reconciliation — the settlement path that does not depend on anyone
 * telling us anything.
 *
 * The return page settles most payments, because most people watch it. This
 * covers the rest: the closed tab, the dead battery, the network that dropped
 * between paying and coming back.
 *
 * It exists because a callback is not available to this app. One PawaPay
 * account has one callback URL per operation type, and that field belongs to
 * another application on the same account (ADR 0019). Everything here would
 * still be worth having with a callback — it is the standard backstop, and
 * the SCD shop has its own `reconcile-orders.mjs` for the same reason.
 *
 * Safe to run repeatedly and concurrently: it funnels into
 * `applyDepositIfCompleted`, whose delivery step is a single guarded
 * transaction.
 */
import "server-only";
import { applyDepositIfCompleted, TransientPaymentError } from "./apply";
import { createAdminSupabase } from "@/lib/supabase/server";
import { logPaymentEvent } from "./intents";

/**
 * Ignore intents younger than this. Someone is probably still on the payment
 * page, and the return-page poll will get there first — no reason to spend a
 * PawaPay call racing it.
 */
const MIN_AGE_SECONDS = 90;

/**
 * Bound the work per run: PawaPay is one API call per intent, and a run that
 * never finishes is worse than one that catches up next time.
 */
const BATCH_SIZE = 50;

export interface ReconcileReport {
  checked: number;
  settled: number;
  failed: number;
  mismatched: number;
  stillPending: number;
  errors: number;
}

export async function reconcilePendingDeposits(): Promise<ReconcileReport> {
  const report: ReconcileReport = {
    checked: 0,
    settled: 0,
    failed: 0,
    mismatched: 0,
    stillPending: 0,
    errors: 0,
  };

  const supabase = createAdminSupabase();
  const cutoff = new Date(Date.now() - MIN_AGE_SECONDS * 1000).toISOString();

  const { data, error } = await supabase
    .from("payment_intents")
    .select("deposit_id, charged_amount")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    // Oldest first: those are the ones most likely to have been abandoned by
    // the browser, and the ones a person is most likely to be chasing.
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[reconcile] could not list pending intents", error.message);
    report.errors++;
    return report;
  }

  for (const row of data ?? []) {
    // A free basket never had a deposit at PawaPay; asking about it would be
    // a guaranteed miss. It is settled at checkout or not at all.
    if (row.charged_amount === 0) continue;

    report.checked++;
    try {
      const outcome = await applyDepositIfCompleted(row.deposit_id);
      if (outcome === "applied") report.settled++;
      else if (outcome === "already_applied") report.settled++;
      else if (outcome === "failed") report.failed++;
      else if (outcome === "amount_mismatch") report.mismatched++;
      else report.stillPending++;
    } catch (err) {
      // Transient means "ask again later", which is exactly what the next run
      // does. Nothing to escalate.
      if (!(err instanceof TransientPaymentError)) {
        console.error("[reconcile] unexpected failure", {
          depositId: row.deposit_id,
          message: (err as Error).message,
        });
      }
      report.errors++;
    }
  }

  if (report.settled > 0 || report.mismatched > 0) {
    await logPaymentEvent(null, "reconciled", { ...report });
  }

  return report;
}
