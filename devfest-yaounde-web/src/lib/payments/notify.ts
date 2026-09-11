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
import { findTier, loadTiers } from "./catalog";
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
        .select("attendee_name, tier_id, badge_code, apparel_size")
        .eq("deposit_id", intent.deposit_id)
        .order("created_at", { ascending: true });

      if (error || !data?.length) {
        await logPaymentEvent(intent.deposit_id, "receipt_skipped", {
          reason: "tickets_unreadable",
        });
        return;
      }

      // The receipt names the tier and lists what it includes, so it has to
      // read the catalog. A ticket row only holds the slug, and "SONNET" on
      // its own tells the attendee nothing about what they bought.
      const l = intent.locale === "en" ? "en" : "fr";
      const tiers = await loadTiers();

      email = renderTicketReceipt(
        intent,
        data.map((t) => {
          const tier = findTier(t.tier_id, tiers);
          return {
            attendeeName: t.attendee_name,
            tierId: t.tier_id,
            badgeCode: t.badge_code,
            apparelSize: t.apparel_size,
            tierName: tier?.name,
            tierLabel: tier?.label?.[l],
            perks: tier?.perks?.map((perk) => perk.label[l] ?? perk.label.fr),
          };
        }),
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
