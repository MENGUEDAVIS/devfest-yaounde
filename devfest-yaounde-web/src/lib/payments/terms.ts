/**
 * The refund acknowledgment, resolved server-side.
 *
 * The wording stored against an order is looked up HERE, from the same
 * message files the screen renders, rather than taken from the request body.
 * A client that posts its own `termsText` could otherwise record that the
 * buyer agreed to something they never saw — which would make the evidence
 * worthless exactly when it matters.
 *
 * The client's only say is `acceptedTerms: true`. Everything else — the
 * wording, the timestamp — comes from this side.
 *
 * See docs/decisions/0022-terms-consent-record.md.
 */
import "server-only";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";

type Locale = "fr" | "en";

const MESSAGES: Record<Locale, unknown> = { fr, en };

/**
 * Tickets and goods carry DIFFERENT terms and always have: a ticket is not
 * refundable at all, while goods can be replaced when they arrive damaged or
 * wrong (docs/content/refund-policy.md). Recording the ticket wording against
 * a shop order would be the wrong evidence, so each kind reads its own key.
 */
const KEY_PATHS = {
  tickets: ["pages", "tickets", "refundAck"],
  shop: ["pages", "shop", "returnsAck"],
} as const;

function lookup(locale: Locale, path: readonly string[]): string | null {
  let node: unknown = MESSAGES[locale];
  for (const segment of path) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" && node.trim() ? node : null;
}

/**
 * The exact sentence the buyer ticked, for this kind and locale.
 *
 * Throws rather than returning a placeholder: an order whose consent record
 * says "unknown" is not evidence, and a missing translation key is a build
 * mistake worth failing loudly on.
 */
export function refundAcknowledgment(
  kind: "tickets" | "shop",
  locale: Locale,
): string {
  const text = lookup(locale, KEY_PATHS[kind]);
  if (!text) {
    throw new Error(
      `no refund acknowledgment copy for ${kind}/${locale} — check messages/${locale}.json`,
    );
  }
  return text;
}
