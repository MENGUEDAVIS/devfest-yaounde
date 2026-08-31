/**
 * Tests for the money path.
 *
 * Scope: the pure logic — pricing, badge codes, callback verification,
 * catalog rules. Anything needing Supabase or the PawaPay API is exercised
 * through the runbook (docs/guides/payments-runbook.md), not here.
 *
 * Run with `npm test`.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as cryptoSign,
} from "node:crypto";

import { normalizeMetadata } from "@/lib/pawapay/metadata";
import {
  badgeCode,
  badgeCodesFor,
  verifyBadgeCode,
} from "@/lib/security/badge-code";
import { verifyCallback } from "@/lib/pawapay/verify";
import { quoteTickets, quoteCart } from "@/lib/payments/pricing";
import { CHECKOUT_ERRORS, CheckoutError } from "@/lib/payments/errors";
import {
  findProduct,
  findTier,
  isValidVariant,
  isPurchasable,
} from "@/lib/payments/catalog";
import { dpFileName } from "@/lib/dp/compose";
import { shareCaption } from "@/lib/dp/share";

const DEPOSIT = "11111111-2222-3333-4444-555555555555";

before(() => {
  process.env.BADGE_CODE_SECRET = "test-secret-that-is-comfortably-long-enough";
});

after(() => {
  delete process.env.BADGE_CODE_SECRET;
});

/** Helper: assert a promise rejects with a specific checkout error code. */
async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(
      err instanceof CheckoutError,
      `expected CheckoutError, got ${err}`,
    );
    assert.equal(err.code, code);
    return true;
  });
}

describe("badge codes", () => {
  it("are deterministic, so a replayed callback regenerates the same code", () => {
    assert.equal(badgeCode(DEPOSIT, 1), badgeCode(DEPOSIT, 1));
  });

  it("differ per attendee and per deposit", () => {
    assert.notEqual(badgeCode(DEPOSIT, 1), badgeCode(DEPOSIT, 2));
    assert.notEqual(
      badgeCode(DEPOSIT, 1),
      badgeCode("99999999-2222-3333-4444-555555555555", 1),
    );
  });

  it("use an unambiguous alphabet and a readable shape", () => {
    const code = badgeCode(DEPOSIT, 1);
    assert.match(code, /^DFY-[0-9A-HJ-NP-TV-Z]{5}-[0-9A-HJ-NP-TV-Z]{5}$/);
    // I, L, O and U are excluded so nothing is misread off a phone screen.
    assert.ok(!/[ILOU]/.test(code.slice(4)));
  });

  it("generate one code per attendee, in order", () => {
    const codes = badgeCodesFor(DEPOSIT, 3);
    assert.equal(codes.length, 3);
    assert.deepEqual(
      codes,
      [1, 2, 3].map((i) => badgeCode(DEPOSIT, i)),
    );
    assert.equal(new Set(codes).size, 3);
  });

  it("verify only against the right deposit and position", () => {
    const code = badgeCode(DEPOSIT, 2);
    assert.ok(verifyBadgeCode(code, DEPOSIT, 2));
    assert.ok(!verifyBadgeCode(code, DEPOSIT, 1));
    assert.ok(!verifyBadgeCode("DFY-AAAAA-AAAAA", DEPOSIT, 2));
  });

  it("refuse to run without a strong secret", () => {
    const saved = process.env.BADGE_CODE_SECRET;
    process.env.BADGE_CODE_SECRET = "short";
    assert.throws(() => badgeCode(DEPOSIT, 1), /BADGE_CODE_SECRET/);
    process.env.BADGE_CODE_SECRET = saved;
  });
});

describe("pawapay metadata", () => {
  it("normalises the array-of-single-key-objects shape", () => {
    assert.deepEqual(
      normalizeMetadata([{ userId: "u1" }, { kind: "tickets" }]),
      {
        userId: "u1",
        kind: "tickets",
      },
    );
  });

  it("normalises the fieldName/fieldValue shape", () => {
    assert.deepEqual(
      normalizeMetadata([{ fieldName: "userId", fieldValue: "u1" }]),
      { userId: "u1" },
    );
  });

  it("normalises a flat record, and survives junk", () => {
    assert.deepEqual(normalizeMetadata({ a: 1 }), { a: "1" });
    assert.deepEqual(normalizeMetadata(null), {});
    assert.deepEqual(normalizeMetadata("nonsense"), {});
  });
});

describe("callback verification", () => {
  const url = new URL("https://example.com/api/payments/pawapay/callback");
  const body = JSON.stringify({ depositId: DEPOSIT });

  it("skips every check and never rejects when nothing is configured", () => {
    const report = verifyCallback(
      { method: "POST", url, headers: new Headers() },
      body,
    );
    assert.equal(report.reject, false);
    assert.equal(report.ip, "skipped");
    assert.equal(report.signature, "skipped");
  });

  it("accepts a correct Content-Digest", () => {
    // sha-256 of the body, base64 — computed the same way the sender would.
    const digest = createHash("sha256").update(body, "utf8").digest("base64");
    const report = verifyCallback(
      {
        method: "POST",
        url,
        headers: new Headers({ "content-digest": `sha-256=:${digest}:` }),
      },
      body,
    );
    assert.equal(report.digest, "pass");
    assert.equal(report.reject, false);
  });

  it("flags a Content-Digest that does not match the body", () => {
    const report = verifyCallback(
      {
        method: "POST",
        url,
        headers: new Headers({ "content-digest": "sha-256=:AAAA:" }),
      },
      body,
    );
    assert.equal(report.digest, "fail");
  });

  it("monitors rather than rejects while enforcement is off", () => {
    process.env.PAWAPAY_CALLBACK_IPS = "203.0.113.7";
    process.env.PAWAPAY_ENFORCE_IP = "false";
    const report = verifyCallback(
      {
        method: "POST",
        url,
        headers: new Headers({ "x-forwarded-for": "198.51.100.4" }),
      },
      body,
    );
    assert.equal(report.ip, "fail");
    assert.equal(report.reject, false, "monitor mode must never reject");
    assert.ok(report.reasons[0].includes("monitor only"));
    delete process.env.PAWAPAY_CALLBACK_IPS;
    delete process.env.PAWAPAY_ENFORCE_IP;
  });

  it("rejects a non-allow-listed IP once enforcement is on", () => {
    process.env.PAWAPAY_CALLBACK_IPS = "203.0.113.7";
    process.env.PAWAPAY_ENFORCE_IP = "true";
    const report = verifyCallback(
      {
        method: "POST",
        url,
        headers: new Headers({
          "x-forwarded-for": "198.51.100.4, 203.0.113.7",
        }),
      },
      body,
    );
    // Only the FIRST hop is the real client; a spoofed tail must not rescue it.
    assert.equal(report.ip, "fail");
    assert.equal(report.reject, true);
    delete process.env.PAWAPAY_CALLBACK_IPS;
    delete process.env.PAWAPAY_ENFORCE_IP;
  });

  it("verifies a real signature, and rebuilds the base behind a relay", () => {
    // PawaPay signs ECDSA P-256 with the raw r||s encoding.
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });

    // The address PawaPay was given — a relay in front of this app.
    const RELAY_AUTHORITY = "abc123.execute-api.us-east-1.amazonaws.com";
    const RELAY_PATH = "/prod/api/webhooks/pawapay/deposits";

    const created = Math.floor(Date.now() / 1000);
    const params = `("@method" "@authority" "@path");created=${created};keyid="k1"`;
    const base = [
      `"@method": POST`,
      `"@authority": ${RELAY_AUTHORITY}`,
      `"@path": ${RELAY_PATH}`,
      `"@signature-params": ${params}`,
    ].join(String.fromCharCode(10));

    const signature = cryptoSign("sha256", Buffer.from(base, "utf8"), {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    });

    process.env.PAWAPAY_CALLBACK_PUBLIC_KEY = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    const headers = new Headers({
      "signature-input": `sig1=${params}`,
      signature: `sig1=:${signature.toString("base64")}:`,
    });
    // The request as WE receive it: our own host and path, not the relay's.
    const received = {
      method: "POST",
      url: new URL("https://devfest.example/api/payments/pawapay/callback"),
      headers,
    };

    // Without the override the base is rebuilt from our address, so a
    // perfectly valid signature cannot verify.
    delete process.env.PAWAPAY_SIGNATURE_AUTHORITY;
    delete process.env.PAWAPAY_SIGNATURE_PATH;
    assert.equal(verifyCallback(received, body).signature, "fail");

    // Told what PawaPay actually signed, it verifies.
    process.env.PAWAPAY_SIGNATURE_AUTHORITY = RELAY_AUTHORITY;
    process.env.PAWAPAY_SIGNATURE_PATH = RELAY_PATH;
    const report = verifyCallback(received, body);
    assert.equal(report.signature, "pass");
    assert.equal(report.replay, "pass", "a fresh signature is not a replay");
    assert.equal(report.reject, false);

    delete process.env.PAWAPAY_SIGNATURE_AUTHORITY;
    delete process.env.PAWAPAY_SIGNATURE_PATH;
    delete process.env.PAWAPAY_CALLBACK_PUBLIC_KEY;
  });

  it("accepts the allow-listed IP as the first forwarded hop", () => {
    process.env.PAWAPAY_CALLBACK_IPS = "203.0.113.7";
    process.env.PAWAPAY_ENFORCE_IP = "true";
    const report = verifyCallback(
      {
        method: "POST",
        url,
        headers: new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      },
      body,
    );
    assert.equal(report.ip, "pass");
    assert.equal(report.reject, false);
    delete process.env.PAWAPAY_CALLBACK_IPS;
    delete process.env.PAWAPAY_ENFORCE_IP;
  });
});

describe("catalog rules", () => {
  it("keeps the free tier at zero", () => {
    assert.equal(findTier("haikyu")?.priceXAF, 0);
  });

  it("treats venue-only and sold-out as not purchasable online", () => {
    assert.equal(isPurchasable(findProduct("mug-community")!), false);
    assert.equal(isPurchasable(findProduct("tote-bag")!), false);
    assert.equal(isPurchasable(findProduct("sticker-pack")!), true);
  });

  it("requires a size on a product that offers sizes", () => {
    const tee = findProduct("tee-edition")!;
    assert.equal(isValidVariant(tee, undefined), false);
    assert.equal(isValidVariant(tee, { size: "M", color: "Noir" }), true);
    assert.equal(isValidVariant(tee, { size: "XXXL" }), false);
    assert.equal(isValidVariant(tee, { size: "M", color: "Fuchsia" }), false);
  });

  it("accepts no variant on a product that has none", () => {
    assert.equal(isValidVariant(findProduct("sticker-pack")!, undefined), true);
  });
});

describe("server-side pricing", () => {
  it("prices tickets from the catalog, one per attendee", async () => {
    const basket = await quoteTickets([
      {
        tierId: "sonnet",
        name: "Ada Nkeng",
        email: "ada@example.com",
        apparelSize: "M",
      },
      {
        tierId: "sonnet",
        name: "Ben Fouda",
        email: "ben@example.com",
        apparelSize: "L",
      },
    ]);
    const sonnet = findTier("sonnet")!.priceXAF;
    assert.equal(basket.lines.length, 1, "same tier collapses to one line");
    assert.equal(basket.lines[0].quantity, 2);
    assert.equal(basket.charged, sonnet * 2);
    assert.equal(basket.currency, "XAF");
  });

  it("charges nothing for the free tier", async () => {
    const basket = await quoteTickets([
      { tierId: "haikyu", name: "Ada Nkeng", email: "ada@example.com" },
    ]);
    assert.equal(basket.charged, 0);
  });

  it("ignores any price the caller tries to smuggle in", async () => {
    const basket = await quoteTickets([
      // The extra fields are not in the schema and must not reach the total.
      {
        tierId: "sonnet",
        name: "Ada Nkeng",
        email: "ada@example.com",
        apparelSize: "M",
        priceXAF: 1,
        lineAmount: 1,
      } as never,
    ]);
    assert.equal(basket.charged, findTier("sonnet")!.priceXAF);
  });

  it("demands an apparel size on an apparel tier", async () => {
    await rejectsWith(
      quoteTickets([
        { tierId: "sonnet", name: "Ada Nkeng", email: "ada@example.com" },
      ]),
      CHECKOUT_ERRORS.APPAREL_SIZE_REQUIRED,
    );
  });

  it("rejects an unknown tier and an empty basket", async () => {
    await rejectsWith(
      quoteTickets([
        { tierId: "nope", name: "Ada Nkeng", email: "ada@example.com" },
      ]),
      CHECKOUT_ERRORS.UNKNOWN_TIER,
    );
    await rejectsWith(quoteTickets([]), CHECKOUT_ERRORS.EMPTY_BASKET);
  });

  it("caps an order at ten tickets", async () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      tierId: "haikyu",
      name: `Person ${i}`,
      email: `p${i}@example.com`,
    }));
    await rejectsWith(
      quoteTickets(many),
      CHECKOUT_ERRORS.ATTENDEE_COUNT_MISMATCH,
    );
  });

  it("prices a shop cart, and multiplies by quantity", async () => {
    const basket = await quoteCart([
      { productId: "sticker-pack", quantity: 3 },
    ]);
    assert.equal(basket.charged, findProduct("sticker-pack")!.priceXAF * 3);
    assert.equal(basket.lines[0].quantity, 3);
  });

  it("refuses a sold-out or venue-only product", async () => {
    await rejectsWith(
      quoteCart([{ productId: "tote-bag", quantity: 1 }]),
      CHECKOUT_ERRORS.PRODUCT_UNAVAILABLE,
    );
    await rejectsWith(
      quoteCart([{ productId: "mug-community", quantity: 1 }]),
      CHECKOUT_ERRORS.PRODUCT_UNAVAILABLE,
    );
  });

  it("refuses an invalid variant and an out-of-range quantity", async () => {
    await rejectsWith(
      quoteCart([
        { productId: "tee-edition", quantity: 1, variant: { size: "XXXL" } },
      ]),
      CHECKOUT_ERRORS.INVALID_VARIANT,
    );
    await rejectsWith(
      quoteCart([{ productId: "sticker-pack", quantity: 99 }]),
      CHECKOUT_ERRORS.INVALID_BODY,
    );
  });
});

describe("dp generator helpers", () => {
  it("builds a safe filename from any nickname", () => {
    assert.equal(dpFileName("Ada Nkeng"), "devfest-yaounde-ada-nkeng.png");
    assert.equal(dpFileName("  "), "devfest-yaounde-devfest.png");
    assert.equal(
      dpFileName("../../etc/passwd"),
      "devfest-yaounde-etcpasswd.png",
    );
    assert.ok(!dpFileName("Ada/Nkeng").includes("/"));
  });

  it("writes a share caption in both languages", () => {
    const fr = shareCaption("fr", "https://devfestyaounde.org");
    const en = shareCaption("en", "https://devfestyaounde.org");
    assert.ok(fr.includes("#DevFestYaounde"));
    assert.ok(en.includes("#DevFestYaounde"));
    assert.notEqual(fr, en, "the two locales must not share one string");
  });
});
