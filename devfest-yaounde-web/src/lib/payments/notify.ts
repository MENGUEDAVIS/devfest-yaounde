/**
 * The receipt email, sent exactly once per order.
 *
 * Idempotency comes for free from where this is called: only when
 * `apply_paid_deposit` reports `applied`, which by construction happens once
 * per deposit. A replayed callback gets `already_applied` and sends nothing.
 *
 * Nothing in here may throw. A mail provider having a bad day must not turn
 * a successful payment into a retried callback — the tickets already exist.
 */
import "server-only";
import { renderOrderReceipt, renderTicketReceipt } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { createAdminSupabase } from "@/lib/supabase/server";
import { logPaymentEvent, type PaymentIntentRow } from "./intents";

export async function sendReceipt(intent: PaymentIntentRow): Promise<void> {
  try {
    const to = intent.contact?.email;
    if (!to) {
      await logPaymentEvent(intent.deposit_id, "receipt_skipped", {
        reason: "no_contact_email",
      });
      return;
    }

    let email;
    if (intent.kind === "tickets") {
      // Badge codes are read back rather than recomputed: what the attendee
      // shows at the door must be what the door will look up.
      const supabase = createAdminSupabase();
      const { data, error } = await supabase
        .from("tickets")
        .select("attendee_name, tier_id, badge_code")
        .eq("deposit_id", intent.deposit_id)
        .order("created_at", { ascending: true });

      if (error || !data?.length) {
        await logPaymentEvent(intent.deposit_id, "receipt_skipped", {
          reason: "tickets_unreadable",
        });
        return;
      }

      email = renderTicketReceipt(
        intent,
        data.map((t) => ({
          attendeeName: t.attendee_name,
          tierId: t.tier_id,
          badgeCode: t.badge_code,
        })),
      );
    } else {
      email = renderOrderReceipt(intent);
    }

    const outcome = await sendEmail(to, email);
    // The address itself stays out of the audit trail (A09).
    await logPaymentEvent(intent.deposit_id, `receipt_${outcome.status}`, {
      kind: intent.kind,
    });
  } catch (err) {
    console.error("[receipt] unexpected failure", {
      depositId: intent.deposit_id,
      message: (err as Error).message,
    });
  }
}
