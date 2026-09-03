/**
 * The wall's consent wording, resolved server-side.
 *
 * Same rule as the refund acknowledgment (ADR 0022), and it matters more
 * here: this record is what says a person agreed to their FACE being shown
 * on a public page. If the client supplied the text, a forged body could
 * record agreement to something never displayed — and the record would be
 * worthless precisely when someone asks why their picture is public.
 *
 * The client's only say is that a box was ticked.
 */
import "server-only";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";

const MESSAGES: Record<"fr" | "en", unknown> = { fr, en };

export function galleryConsentText(locale: "fr" | "en"): string {
  const root = MESSAGES[locale] as
    { pages?: { dpGenerator?: { wall?: { consent?: unknown } } } } | undefined;
  const text = root?.pages?.dpGenerator?.wall?.consent;

  if (typeof text !== "string" || !text.trim()) {
    // Loud, not a placeholder: a consent record that says "unknown" is not a
    // record, and a missing key here is a build mistake worth stopping for.
    throw new Error(
      `no wall consent copy for ${locale} — check messages/${locale}.json`,
    );
  }
  return text;
}
