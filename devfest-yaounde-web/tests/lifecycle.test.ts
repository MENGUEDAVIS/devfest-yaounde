/**
 * Tests for the operational logic added alongside the capacity fix:
 * order-status transitions, receipt rendering, tier capacity extraction.
 *
 * The capacity and discount reservations themselves live in SQL and are
 * verified against the real database — see docs/guides/payments-runbook.md.
 * They cannot be meaningfully unit-tested here, because what they guard
 * against is concurrency, which is exactly what an in-process test removes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ORDER_STATUSES,
  canTransition,
  isOrderStatus,
  type OrderStatus,
} from "@/lib/payments/order-lifecycle";
import {
  RESERVATION_WINDOW_SECONDS,
  tierCapacities,
} from "@/lib/payments/catalog";
import { renderOrderReceipt, renderTicketReceipt } from "@/lib/email/templates";
import type { PaymentIntentRow } from "@/lib/payments/intents";

function intent(overrides: Partial<PaymentIntentRow> = {}): PaymentIntentRow {
  return {
    deposit_id: "11111111-2222-3333-4444-555555555555",
    user_id: "u1",
    kind: "tickets",
    status: "activated",
    charged_amount: 10000,
    net_amount: 10000,
    currency: "XAF",
    discount_code: null,
    discount_amount: 0,
    line_items: [],
    attendees: null,
    contact: { email: "ada@example.com" },
    locale: "fr",
    failure_code: null,
    terms_text: "Je comprends que les billets ne sont pas remboursables.",
    terms_accepted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    activated_at: null,
    ...overrides,
  };
}

describe("order lifecycle", () => {
  it("only moves forward", () => {
    assert.ok(canTransition("processing", "shipped"));
    assert.ok(canTransition("ready_for_pickup", "delivered"));
    assert.ok(!canTransition("delivered", "processing"));
    assert.ok(!canTransition("shipped", "ready_for_pickup"));
  });

  it("treats delivered and cancelled as terminal", () => {
    for (const status of ORDER_STATUSES) {
      assert.ok(!canTransition("delivered", status), `delivered -> ${status}`);
      assert.ok(!canTransition("cancelled", status), `cancelled -> ${status}`);
    }
  });

  it("allows cancelling anything still in motion", () => {
    for (const status of [
      "processing",
      "ready_for_pickup",
      "shipped",
    ] as OrderStatus[]) {
      assert.ok(canTransition(status, "cancelled"), `${status} -> cancelled`);
    }
  });

  it("rejects anything that is not a status", () => {
    assert.ok(isOrderStatus("processing"));
    assert.ok(!isOrderStatus("PROCESSING"));
    assert.ok(!isOrderStatus("refunded"));
    assert.ok(!isOrderStatus(3));
  });
});

describe("tier capacities", () => {
  it("only lists tiers that actually cap", () => {
    const caps = tierCapacities();
    // The free tier is unlimited and must be absent, or the SQL would cap it.
    assert.equal(caps.haikyu, undefined);
    assert.equal(typeof caps.opus, "number");
    assert.ok(caps.opus > 0);
  });

  it("holds a reservation long enough for a Mobile Money prompt", () => {
    assert.ok(RESERVATION_WINDOW_SECONDS >= 600);
    assert.ok(RESERVATION_WINDOW_SECONDS <= 3600);
  });
});

describe("receipt emails", () => {
  const tickets = [
    {
      attendeeName: "Ada Nkeng",
      tierId: "sonnet",
      badgeCode: "DFY-ABCDE-FGHJK",
    },
  ];

  it("writes the ticket receipt in the locale the buyer chose", () => {
    const fr = renderTicketReceipt(intent({ locale: "fr" }), tickets);
    const en = renderTicketReceipt(intent({ locale: "en" }), tickets);
    assert.notEqual(fr.subject, en.subject);
    assert.match(fr.text, /porte/);
    assert.match(en.text, /door/);
  });

  it("puts the badge code in both the text and the html part", () => {
    const mail = renderTicketReceipt(intent(), tickets);
    assert.match(mail.text, /DFY-ABCDE-FGHJK/);
    assert.match(mail.html, /DFY-ABCDE-FGHJK/);
  });

  it("does not show a total on a free ticket", () => {
    const paid = renderTicketReceipt(
      intent({ charged_amount: 10000 }),
      tickets,
    );
    const free = renderTicketReceipt(intent({ charged_amount: 0 }), tickets);
    assert.match(paid.text, /10\D?000/);
    assert.ok(!/Total/i.test(free.text), "a free ticket has no total to show");
  });

  it("escapes anything a buyer typed into their own name", () => {
    const mail = renderTicketReceipt(intent(), [
      {
        attendeeName: "<script>alert(1)</script>",
        tierId: "sonnet",
        badgeCode: "DFY-ABCDE-FGHJK",
      },
    ]);
    assert.ok(
      !mail.html.includes("<script>"),
      "raw script tag reached the html",
    );
    assert.match(mail.html, /&lt;script&gt;/);
  });

  it("lists shop items with quantity and localized name", () => {
    const mail = renderOrderReceipt(
      intent({
        kind: "shop",
        charged_amount: 9000,
        line_items: [
          {
            productId: "sticker-pack",
            name: { fr: "Pack de stickers", en: "Sticker pack" },
            quantity: 3,
            unitAmount: 3000,
            lineAmount: 9000,
          },
        ],
      }),
    );
    assert.match(mail.text, /3 × Pack de stickers/);
    assert.match(mail.text, /9\D?000/);
  });
});
