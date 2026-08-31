/**
 * Email dispatch.
 *
 * No provider was ever chosen (`docs/decisions/0003`), so this is written as
 * a port with two adapters and no decision baked in:
 *
 *   RESEND_API_KEY set    → sent through Resend
 *   RESEND_API_KEY unset  → logged, and reported as skipped
 *
 * Both paths are real code paths. Adding a different provider means one more
 * branch here and nothing else, because the templates and the "when to send"
 * logic are provider-agnostic.
 *
 * Sending must NEVER fail a payment. Everything here returns an outcome
 * rather than throwing, and the caller treats a failure as a log line.
 */
import "server-only";
import type { RenderedEmail } from "./templates";

export type SendOutcome =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

const SEND_TIMEOUT_MS = 8000;

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "DevFest Yaoundé <onboarding@resend.dev>";
}

export async function sendEmail(
  to: string,
  email: RenderedEmail,
): Promise<SendOutcome> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Not an error: a preview deploy or a local run legitimately has no mail
    // provider, and the payment still has to complete.
    console.info("[email] no provider configured, not sending", {
      to,
      subject: email.subject,
    });
    return { status: "skipped", reason: "no_provider" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      // Body may carry the recipient; keep it out of the log (A09).
      console.error("[email] provider rejected the message", {
        status: response.status,
        detail: detail.slice(0, 200),
      });
      return { status: "failed", reason: `http_${response.status}` };
    }

    const body = (await response.json()) as { id?: string };
    return { status: "sent", id: body.id };
  } catch (err) {
    console.error("[email] send threw", (err as Error).message);
    return { status: "failed", reason: "exception" };
  }
}
