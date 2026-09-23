import { describe, it } from "node:test";
import assert from "node:assert/strict";
import productsJson from "@/data/products.json";
import type { Product } from "@/data/types";
import { collectionSchemas } from "@/lib/content/schemas";
import {
  isPublished,
  isShopProduct,
  isSwagProduct,
} from "@/lib/content/product-visibility";
import { isPurchasable } from "@/lib/payments/catalog";

const seed = productsJson as Product[];
const make = (over: Partial<Product>): Product => ({
  ...seed[0],
  id: "certificate",
  status: "in-stock",
  ...over,
});

describe("where a product may appear", () => {
  it("an ordinary product is in the shop and on ticket cards", () => {
    const p = make({});
    assert.equal(isShopProduct(p), true);
    assert.equal(isSwagProduct(p), true);
  });

  it("a ticket-only product is on ticket cards but NOT in the shop", () => {
    const p = make({ ticketOnly: true });
    assert.equal(isShopProduct(p), false);
    assert.equal(isSwagProduct(p), true);
  });

  it("a hidden product is nowhere, and ticket-only does not override that", () => {
    for (const p of [
      make({ published: false }),
      make({ published: false, ticketOnly: true }),
    ]) {
      assert.equal(isPublished(p), false);
      assert.equal(isShopProduct(p), false);
      assert.equal(isSwagProduct(p), false);
    }
  });

  it("absent flags mean an ordinary, live product — every record written before these existed", () => {
    assert.equal(isShopProduct({}), true);
    assert.equal(isSwagProduct({}), true);
    assert.equal(isShopProduct({ published: true, ticketOnly: false }), true);
  });

  it("splits a mixed catalogue into the two views correctly", () => {
    const catalogue = [
      make({ id: "tee" }),
      make({ id: "cert", ticketOnly: true }),
      make({ id: "draft", published: false }),
    ];
    assert.deepEqual(
      catalogue.filter(isShopProduct).map((p) => p.id),
      ["tee"],
    );
    assert.deepEqual(
      catalogue.filter(isSwagProduct).map((p) => p.id),
      ["tee", "cert"],
    );
  });

  it("changes nothing for the real seed catalogue", () => {
    assert.equal(
      seed.filter(isShopProduct).length,
      seed.filter(isPublished).length,
    );
  });
});

describe("a ticket-only product can never be ordered", () => {
  it("is refused by the purchasability rule whatever its status says", () => {
    for (const status of [
      "pre-order",
      "in-stock",
      "venue-only",
      "sold-out",
    ] as const) {
      assert.equal(
        isPurchasable(make({ status, ticketOnly: true })),
        false,
        status,
      );
    }
    // ...and a normal product is unaffected.
    assert.equal(isPurchasable(make({ status: "in-stock" })), true);
    assert.equal(isPurchasable(make({ status: "pre-order" })), true);
    assert.equal(isPurchasable(make({ status: "sold-out" })), false);
  });
});

describe("the stored shape", () => {
  it("accepts ticketOnly as an optional boolean", () => {
    const parse = (extra: object) =>
      collectionSchemas.products.safeParse([{ ...seed[0], ...extra }]).success;
    assert.equal(parse({}), true);
    assert.equal(parse({ ticketOnly: true }), true);
    assert.equal(parse({ ticketOnly: false }), true);
    assert.equal(parse({ ticketOnly: "yes" }), false);
  });

  it("lets a ticket-only product have no price", () => {
    const row = { ...seed[0], ticketOnly: true, priceXAF: 0, images: [] };
    assert.equal(collectionSchemas.products.safeParse([row]).success, true);
  });
});
