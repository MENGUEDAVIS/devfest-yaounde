/**
 * POST /api/payments/pawapay/callback
 *
 * PawaPay's deposit notification. Register this URL in the PawaPay dashboard.
 *
 * Two things define this handler:
 *
 *   The body decides nothing. It is read for one field — `depositId` — and
 *   everything else comes from re-fetching the deposit through the API. A
 *   forged callback claiming COMPLETED gets checked against PawaPay and
 *   dropped.
 *
 *   The status code is a control signal, not decoration:
 *     200  terminal — applied, ignored, failed, or mismatched. Stop resending.
 *     5xx  transient — we could not reach PawaPay, or the intent is not
 *          written yet. Please resend.
 *
 * It must also answer fast. Fulfilment is a handful of inserts inside one SQL
 * function, so the work stays well inside any gateway timeout.
 */
import { NextRequest } from "next/server";
import {
  applyDepositIfCompleted,
  TransientPaymentError,
} from "@/lib/payments/apply";
import { logPaymentEvent } from "@/lib/payments/intents";
import { depositIdSchema } from "@/lib/payments/schemas";
import { verifyCallback } from "@/lib/pawapay/verify";

export async function POST(request: NextRequest) {
  // The raw body, kept as bytes-as-received: Content-Digest is computed over
  // exactly these characters, and re-serialising parsed JSON would not match.
  const rawBody = await request.text();

  const report = verifyCallback(
    {
      method: request.method,
      url: new URL(request.url),
      headers: request.headers,
    },
    rawBody,
  );

  if (report.reasons.length > 0) {
    console.warn("[pawapay/callback] verification findings", {
      ip: report.ip,
      digest: report.digest,
      signature: report.signature,
      replay: report.replay,
      reasons: report.reasons,
      enforced: report.reject,
    });
  }

  if (report.reject) {
    await logPaymentEvent(null, "callback_rejected", {
      reasons: report.reasons,
    });
    // Terminal: a request that fails an enforced check is not one we want
    // replayed. Deliberately vague to the caller.
    return Response.json({ received: true }, { status: 200 });
  }

  let depositId: string | null = null;
  try {
    const parsed = JSON.parse(rawBody) as { depositId?: unknown };
    const candidate = depositIdSchema.safeParse(parsed.depositId);
    if (candidate.success) depositId = candidate.data;
  } catch {
    // Unparseable body — nothing to act on, and resending will not help.
  }

  if (!depositId) {
    await logPaymentEvent(null, "callback_without_deposit_id");
    return Response.json({ received: true }, { status: 200 });
  }

  try {
    const outcome = await applyDepositIfCompleted(depositId);
    return Response.json({ received: true, outcome }, { status: 200 });
  } catch (err) {
    if (err instanceof TransientPaymentError) {
      console.warn("[pawapay/callback] transient failure, asking for a retry", {
        depositId,
        message: err.message,
      });
      return Response.json({ error: "retry", retry: true }, { status: 503 });
    }
    // Unknown failure: also ask for a retry rather than silently swallowing a
    // real payment. Repeated failures surface in payment_events.
    console.error("[pawapay/callback] unexpected failure", { depositId, err });
    await logPaymentEvent(depositId, "callback_unexpected_error");
    return Response.json({ error: "retry", retry: true }, { status: 503 });
  }
}
