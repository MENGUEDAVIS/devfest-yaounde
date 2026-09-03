/**
 * The checkout step shared by tickets and shop.
 *
 * Order matters and is the whole point:
 *   1. authenticate       — the user id comes from the session, never the body
 *   2. rate limit         — before we spend a PawaPay call on them
 *   3. price server-side  — from the catalog, by id
 *   4. PERSIST the intent — before any redirect exists
 *   5. create the page    — or, for a 0 XAF basket, fulfil straight away
 *
 * Step 4 before step 5 is not stylistic. If the Payment Page were created
 * first and our write then failed, PawaPay could take money for something we
 * have no record of owing.
 */
import "server-only";
import type { AttendeeInput, PricedBasket } from "@/data/types";
import { COUNTRY } from "./catalog";
import { CHECKOUT_ERRORS, CheckoutError } from "./errors";
import { createPaymentIntent, logPaymentEvent } from "./intents";
import { fulfilFreeIntent } from "./apply";
import { createDepositId, createPaymentPage } from "@/lib/pawapay/client";
import { assertBadgeSecretConfigured } from "@/lib/security/badge-code";
import { refundAcknowledgment } from "./terms";

export interface CheckoutResult {
  depositId: string;
  /** Absent when the basket is free — there is nothing to pay. */
  redirectUrl?: string;
  /** True when the order was completed on the spot (free tier). */
  fulfilled: boolean;
  charged: number;
  currency: string;
}

function appBaseUrl(): string {
  const url = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (!url) throw new Error("APP_BASE_URL is not set — see .env.example");
  return url.replace(/\/+$/, "");
}

export interface StartCheckoutInput {
  userId: string;
  kind: "tickets" | "shop";
  quote: PricedBasket;
  attendees?: AttendeeInput[];
  contact: { email: string; phone?: string };
  locale: "fr" | "en";
  /** Shop only. Ignored for tickets — there is nothing to deliver. */
  fulfilment?: { method: "pickup" | "shipping"; note?: string };
}

export async function startCheckout(
  input: StartCheckoutInput,
): Promise<CheckoutResult> {
  // Before anything irreversible: a ticket order that cannot mint badge codes
  // must fail now, not after the buyer has paid for it.
  if (input.kind === "tickets") assertBadgeSecretConfigured();

  const depositId = createDepositId();

  // 4. The anchor of trust, written first — and the point where tier capacity
  // and the discount redemption are actually reserved. A refusal here is the
  // real "sold out", not the optimistic check the quote did earlier.
  const created = await createPaymentIntent({
    depositId,
    userId: input.userId,
    kind: input.kind,
    quote: input.quote,
    attendees: input.attendees,
    contact: input.contact,
    locale: input.locale,
    // Evidence, not a claim: the wording comes from our own messages for the
    // locale the buyer was served, never from the request body.
    termsText: refundAcknowledgment(input.kind, input.locale),
    fulfilment: input.kind === "shop" ? input.fulfilment : undefined,
  });

  if (created.status === "sold_out") {
    await logPaymentEvent(depositId, "reservation_refused", {
      reason: "sold_out",
      tierId: created.tierId,
    });
    throw new CheckoutError(CHECKOUT_ERRORS.TIER_SOLD_OUT, 409);
  }
  if (created.status === "discount_exhausted") {
    await logPaymentEvent(depositId, "reservation_refused", {
      reason: "discount_exhausted",
    });
    throw new CheckoutError(CHECKOUT_ERRORS.DISCOUNT_EXHAUSTED, 409);
  }
  await logPaymentEvent(depositId, "intent_created", {
    kind: input.kind,
    charged: input.quote.charged,
  });

  // 5a. Free basket: PawaPay cannot process 0, and there is nothing to
  // collect. Same fulfilment path, so the ticket behaves identically.
  if (input.quote.charged === 0) {
    await fulfilFreeIntent(depositId);
    return {
      depositId,
      fulfilled: true,
      charged: 0,
      currency: input.quote.currency,
    };
  }

  // 5b. Hosted Payment Page.
  const returnUrl = `${appBaseUrl()}/${input.locale}/payments/return?depositId=${depositId}`;

  const session = await createPaymentPage({
    depositId,
    returnUrl,
    country: COUNTRY,
    language: input.locale.toUpperCase() as "FR" | "EN",
    reason:
      input.kind === "tickets"
        ? "DevFest Yaounde ticket"
        : "DevFest Yaounde shop",
    amountDetails: {
      amount: String(input.quote.charged),
      currency: input.quote.currency,
    },
    phoneNumber: input.contact.phone,
    // Observability only. Fulfilment reads the intent, never this.
    metadata: [{ kind: input.kind }, { depositId }],
  });

  if (!session.redirectUrl) {
    await logPaymentEvent(depositId, "payment_page_failed", {
      failureCode: session.failureReason?.failureCode ?? null,
    });
    throw new CheckoutError(CHECKOUT_ERRORS.PAYMENT_PAGE_FAILED, 502);
  }

  return {
    depositId,
    redirectUrl: session.redirectUrl,
    fulfilled: false,
    charged: input.quote.charged,
    currency: input.quote.currency,
  };
}
