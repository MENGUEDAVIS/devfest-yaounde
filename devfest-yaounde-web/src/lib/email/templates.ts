/**
 * Receipt and confirmation emails.
 *
 * Bilingual, because `PAGES.md` §10.2 lists email/receipt templates as
 * content that must exist in both languages. The locale comes from the
 * payment intent, captured at checkout — not from whatever language the
 * server happens to think it is.
 *
 * Tone follows the brand voice: warm, active, a little celebratory. This is
 * the first thing someone reads after paying, so it should not sound like a
 * bank statement.
 *
 * Plain text alongside HTML on purpose: mobile mail clients in Cameroon are
 * a mixed bag, and a text part that reads well is cheap insurance.
 */
import type { PaymentIntentRow } from "@/lib/payments/intents";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

type Locale = "fr" | "en";

function locale(intent: PaymentIntentRow): Locale {
  return intent.locale === "en" ? "en" : "fr";
}

/** XAF has no minor unit; group thousands so 35000 reads as 35 000. */
function money(amount: number, l: Locale): string {
  return `${new Intl.NumberFormat(l === "fr" ? "fr-CM" : "en-CM").format(amount)} XAF`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  // Inline styles only: every serious mail client strips <style> blocks.
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#FCF6DF;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1E1E1E">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="margin:32px 0 0;font-size:13px;color:#4D4D4D">DevFest Yaoundé — GDG Yaoundé</p>
</div></body></html>`;
}

export interface TicketForEmail {
  attendeeName: string;
  tierId: string;
  badgeCode: string;
}

/** Sent once, when a ticket order is fulfilled. */
export function renderTicketReceipt(
  intent: PaymentIntentRow,
  tickets: TicketForEmail[],
): RenderedEmail {
  const l = locale(intent);
  const free = intent.charged_amount === 0;

  const subject =
    l === "fr"
      ? `Ta place est réservée — DevFest Yaoundé`
      : `You're in — DevFest Yaoundé`;

  const intro =
    l === "fr"
      ? free
        ? "C'est confirmé, on se voit au DevFest. Voici ton code d'entrée — garde-le, c'est lui qu'on scanne à la porte."
        : "Paiement reçu, merci ! Voici ton code d'entrée — garde-le, c'est lui qu'on scanne à la porte."
      : free
        ? "You're confirmed — see you at DevFest. Here's your entry code; keep it, that's what we scan at the door."
        : "Payment received, thank you! Here's your entry code; keep it, that's what we scan at the door.";

  const codesLabel = l === "fr" ? "Code d'entrée" : "Entry code";
  const totalLabel = l === "fr" ? "Total payé" : "Total paid";

  const lines = tickets.map(
    (t) => `${t.attendeeName} — ${t.tierId.toUpperCase()} — ${t.badgeCode}`,
  );

  const text = [
    intro,
    "",
    ...lines.map((line) => `  ${line}`),
    "",
    free ? "" : `${totalLabel} : ${money(intent.charged_amount, l)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const rows = tickets
    .map(
      (t) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid #eee">${escapeHtml(t.attendeeName)}<br>
<span style="font-size:13px;color:#4D4D4D">${escapeHtml(t.tierId.toUpperCase())}</span></td>
<td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-family:ui-monospace,monospace;font-weight:600">${escapeHtml(t.badgeCode)}</td>
</tr>`,
    )
    .join("");

  const html = layout(
    subject,
    `<p style="margin:0 0 20px;line-height:1.6">${escapeHtml(intro)}</p>
<p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#4D4D4D">${escapeHtml(codesLabel)}</p>
<table style="width:100%;border-collapse:collapse">${rows}</table>
${free ? "" : `<p style="margin:20px 0 0;font-weight:600">${escapeHtml(totalLabel)} : ${escapeHtml(money(intent.charged_amount, l))}</p>`}`,
  );

  return { subject, text, html };
}

/** Sent once, when a shop order is fulfilled. */
export function renderOrderReceipt(intent: PaymentIntentRow): RenderedEmail {
  const l = locale(intent);

  const subject =
    l === "fr"
      ? "Commande confirmée — DevFest Yaoundé"
      : "Order confirmed — DevFest Yaoundé";

  const intro =
    l === "fr"
      ? "Merci ! Ta commande est enregistrée. On te préviendra dès qu'elle est prête à être récupérée."
      : "Thank you! Your order is in. We'll let you know as soon as it's ready to collect.";

  const totalLabel = l === "fr" ? "Total payé" : "Total paid";

  const items = intent.line_items.map((line) => {
    const name = line.name[l] ?? line.name.fr;
    const variant = [line.variant?.size, line.variant?.color]
      .filter(Boolean)
      .join(" · ");
    return {
      label: variant ? `${name} (${variant})` : name,
      qty: line.quantity,
      amount: money(line.lineAmount, l),
    };
  });

  const text = [
    intro,
    "",
    ...items.map((i) => `  ${i.qty} × ${i.label} — ${i.amount}`),
    "",
    `${totalLabel} : ${money(intent.charged_amount, l)}`,
  ].join("\n");

  const rows = items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid #eee">${escapeHtml(String(i.qty))} × ${escapeHtml(i.label)}</td>
<td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(i.amount)}</td>
</tr>`,
    )
    .join("");

  const html = layout(
    subject,
    `<p style="margin:0 0 20px;line-height:1.6">${escapeHtml(intro)}</p>
<table style="width:100%;border-collapse:collapse">${rows}</table>
<p style="margin:20px 0 0;font-weight:600">${escapeHtml(totalLabel)} : ${escapeHtml(money(intent.charged_amount, l))}</p>`,
  );

  return { subject, text, html };
}
