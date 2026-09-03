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
  assertBadgeSecretConfigured,
  badgeCode,
  badgeCodesFor,
  verifyBadgeCode,
} from "@/lib/security/badge-code";
import { verifyCallback } from "@/lib/pawapay/verify";
import { quoteTickets, quoteCart } from "@/lib/payments/pricing";
import { refundAcknowledgment } from "@/lib/payments/terms";
import {
  ticketCheckoutSchema,
  shopCheckoutSchema,
  fulfilmentRequestSchema,
} from "@/lib/payments/schemas";
import { CHECKOUT_ERRORS, CheckoutError } from "@/lib/payments/errors";
import {
  declaredStock,
  findProduct,
  findTier,
  isValidVariant,
  isPurchasable,
  sellableTiers,
  variantCapacities,
  variantKey,
} from "@/lib/payments/catalog";
import { dpFileName } from "@/lib/dp/compose";
import { shareCaption } from "@/lib/dp/share";
import { eventDates, eventJsonLd, organizationJsonLd } from "@/lib/event";
import { layoutCard, PAD, PLATE_INSET } from "@/lib/dp/geometry";
import { ALL_STICKERS, TEXT_STICKERS, stickerName } from "@/lib/dp/stickers";
import { galleryEnabled, GALLERY_MAX_EDGE } from "@/lib/dp/gallery";
import {
  csvCell,
  toCsv,
  parseCsv,
  dryRun,
  looksLikeFormula,
} from "@/lib/admin/csv";
import {
  hashToken,
  mintDeletionToken,
  tokensMatch,
  MAX_EDGE,
  MAX_BYTES,
} from "@/lib/dp/gallery-server";
import { galleryConsentText } from "@/lib/dp/gallery-consent";
import {
  DEFAULT_RETENTION_DAYS,
  purgeExpiredCards,
} from "@/lib/dp/gallery-retention";

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

  it("are refused at checkout time when the secret is unusable", () => {
    const saved = process.env.BADGE_CODE_SECRET;

    // An EMPTY value must fail exactly like an absent one — both describe a
    // deployment that cannot issue a ticket, and the failure has to surface
    // before a payment page exists rather than after the buyer has paid.
    process.env.BADGE_CODE_SECRET = "";
    assert.throws(assertBadgeSecretConfigured, /BADGE_CODE_SECRET/);

    delete process.env.BADGE_CODE_SECRET;
    assert.throws(assertBadgeSecretConfigured, /BADGE_CODE_SECRET/);

    process.env.BADGE_CODE_SECRET = "too-short";
    assert.throws(assertBadgeSecretConfigured, /BADGE_CODE_SECRET/);

    process.env.BADGE_CODE_SECRET = saved;
    assert.doesNotThrow(assertBadgeSecretConfigured);
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

  it("refuses a tier whose RSVP is delegated off-site", async () => {
    // haikyu carries rsvpExternal: the community platform enforces one free
    // RSVP per person. Without a server check, a direct POST would mint
    // unlimited free tickets with valid badge codes and bypass that entirely.
    const free = findTier("haikyu")!;
    assert.equal(free.rsvpExternal, true, "fixture assumption");
    assert.equal(free.priceXAF, 0, "fixture assumption");

    await rejectsWith(
      quoteTickets([
        { tierId: "haikyu", name: "Ada Nkeng", email: "ada@example.com" },
      ]),
      CHECKOUT_ERRORS.TIER_RSVP_EXTERNAL,
    );
  });

  it("has no tier that is both free and sold here", () => {
    // This used to assert that haikyu checked out at 0 XAF. It no longer can:
    // the free pass became `rsvpExternal` when the RSVP moved to the community
    // platform, so nothing purchasable costs nothing.
    //
    // The zero-charge path in `startCheckout` is still live and still needed —
    // a 100%-off discount reaches it — which is why `fulfilFreeIntent` stays.
    // It just cannot be reached through a tier price any more.
    const sellableFree = sellableTiers().filter(
      (tier) => tier.priceXAF === 0 && !tier.rsvpExternal,
    );
    assert.deepEqual(
      sellableFree.map((tier) => tier.id),
      [],
      "a free, non-external tier would need the checkout path re-tested",
    );
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

describe("event structured data", () => {
  it("stays silent while the date is unconfirmed", () => {
    // startDate is REQUIRED by schema.org. An Event block without one is
    // invalid data that Search Console reports, and inventing a date would
    // publish a wrong one to every crawler that read it.
    assert.equal(eventDates(null), null);
    assert.equal(eventJsonLd("fr", "x", null), null);
  });

  it("switches itself on the moment a date lands", () => {
    const data = eventJsonLd("en", "Two days in Yaoundé", "2026-11-14");
    assert.ok(data, "a dated event must produce a block");
    assert.equal(data!["@type"], "Event");
    assert.equal(data!.startDate, "2026-11-14T09:00:00");
    // Two days, so the end is the FOLLOWING day — the same assumption the
    // add-to-calendar links make.
    assert.equal(data!.endDate, "2026-11-15T18:00:00");
    assert.ok(String(data!.url).endsWith("/en"));
  });

  it("always describes the organiser, since none of that is speculative", () => {
    const org = organizationJsonLd();
    assert.equal(org["@type"], "Organization");
    assert.equal(org.name, "GDG Yaoundé");
    assert.ok(org.url.startsWith("https://"));
  });
});

describe("dp stickers", () => {
  it("keeps every word sticker to one hashtag token", () => {
    for (const sticker of TEXT_STICKERS) {
      for (const locale of ["fr", "en"] as const) {
        const text = sticker.text[locale];
        assert.ok(text.startsWith("#"), `${sticker.id}/${locale}: ${text}`);
        // A hashtag breaks at the first space, so a multi-word phrase would
        // silently post as one word plus loose text.
        assert.ok(
          !/\s/.test(text),
          `${sticker.id}/${locale} has a space: ${text}`,
        );
      }
    }
  });

  it("gives every sticker a distinct id", () => {
    const ids = ALL_STICKERS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("names every sticker in both languages", () => {
    for (const sticker of ALL_STICKERS) {
      for (const locale of ["fr", "en"] as const) {
        assert.ok(stickerName(sticker.id, locale).length > 0);
      }
    }
  });
});

describe("dp community wall", () => {
  it("is off unless the deployment switches it on", () => {
    // The endpoint does not exist (GAPS.md G20). Dark by default is what
    // keeps a button that would quietly fail off the screen entirely.
    assert.equal(process.env.NEXT_PUBLIC_DP_GALLERY, undefined);
    assert.equal(galleryEnabled(), false);
  });

  it("uploads a thumbnail, not the download", () => {
    assert.ok(GALLERY_MAX_EDGE < 1080);
  });
});

describe("admin csv safety", () => {
  it("neutralises every character a spreadsheet would execute", () => {
    // The nickname field is free text typed by strangers, and it ends up in
    // an organiser's Excel. OWASP CSV injection.
    for (const attack of [
      '=HYPERLINK("http://evil","Click")',
      "+1+1",
      "-2+3",
      "@SUM(A1:A9)",
      "\tcmd",
      "\rcmd",
    ]) {
      const cell = csvCell(attack);
      assert.ok(
        cell.startsWith("'") || cell.startsWith("\"'"),
        `not neutralised: ${JSON.stringify(cell)}`,
      );
    }
  });

  it("quotes before it can hide the formula marker", () => {
    // Order matters: quoting first would bury the leading `=` behind a quote
    // and the check would stop matching.
    const cell = csvCell('=1+1,"x"');
    assert.ok(cell.includes("'=1+1"), cell);
    assert.ok(cell.startsWith('"'), cell);
  });

  it("leaves ordinary values alone", () => {
    assert.equal(csvCell("Ada Nkeng"), "Ada Nkeng");
    assert.equal(csvCell(2000), "2000");
    assert.equal(csvCell(null), "");
    assert.equal(csvCell("with, comma"), '"with, comma"');
  });

  it("round-trips quoted fields, doubled quotes and embedded newlines", () => {
    const csv = toCsv(["a", "b"], [['say "hi"', "two\nlines"]]);
    const parsed = parseCsv(csv);
    assert.deepEqual(parsed.headers, ["a", "b"]);
    assert.deepEqual(parsed.rows, [['say "hi"', "two\nlines"]]);
  });

  it("reports every problem in a sheet, not just the first", () => {
    const csv = "id,name\n,Ada\nb2,\nb3,=cmd()";
    const result = dryRun(parseCsv(csv), [
      { column: "id", required: true },
      { column: "name", required: true, maxLength: 10 },
    ]);
    assert.equal(result.rows.length, 3);
    // missing id, missing name, and a formula — three separate rows
    assert.ok(result.issues.length >= 3, JSON.stringify(result.issues));
    assert.ok(result.issues.some((i) => /formula/.test(i.problem)));
    // Row numbers are 1-based WITH the header, so they match the spreadsheet.
    assert.equal(result.issues[0].row, 2);
  });

  it("names columns it does not know and required ones it cannot find", () => {
    const result = dryRun(parseCsv("id,nickname\nx,y"), [
      { column: "id", required: true },
      { column: "name", required: true },
    ]);
    assert.deepEqual(result.missingColumns, ["name"]);
    assert.deepEqual(result.unknownColumns, ["nickname"]);
  });

  it("flags formulas on the way in as well as out", () => {
    assert.ok(looksLikeFormula("=1+1"));
    assert.ok(!looksLikeFormula("Ada"));
  });
});

describe("dp card geometry", () => {
  it("decreases nested radii by exactly the padding between them", () => {
    for (const ratio of ["1:1", "3:4"] as const) {
      const l = layoutCard(1080, ratio);
      // The standard nested-radius rule: outer = inner + padding. Matching
      // radii at every level is what makes concentric rounded shapes look
      // wrong, so this is a correctness property, not a preference.
      assert.ok(
        l.radius.card > l.radius.photo && l.radius.photo > l.radius.plate,
        `radii must decrease inward: ${JSON.stringify(l.radius)}`,
      );
      assert.ok(Math.abs(l.radius.card - l.radius.photo - PAD * 1080) < 0.51);
      assert.ok(
        Math.abs(l.radius.photo - l.radius.plate - PLATE_INSET * 1080) < 0.51,
      );
      assert.ok(l.radius.plate > 0, "no corner may be sharp");
    }
  });

  it("centres the photo on the card, in both directions", () => {
    for (const ratio of ["1:1", "3:4"] as const) {
      const l = layoutCard(1080, ratio);
      const right = l.width - (l.photo.x + l.photo.w);
      const bottom = l.height - (l.photo.y + l.photo.h);
      assert.ok(
        Math.abs(l.photo.x - right) < 0.51,
        `left ${l.photo.x} vs right ${right}`,
      );
      assert.ok(
        Math.abs(l.photo.y - bottom) < 0.51,
        `top ${l.photo.y} vs bottom ${bottom}`,
      );
    }
  });

  it("keeps the plate inside the photo, on the same centreline", () => {
    const l = layoutCard(1080, "1:1");
    const plateCentre = l.plate.x + l.plate.w / 2;
    assert.ok(Math.abs(plateCentre - l.width / 2) < 0.51);
    assert.ok(l.plate.x >= l.photo.x);
    assert.ok(l.plate.y + l.plate.h <= l.photo.y + l.photo.h + 0.51);
  });

  it("makes a tall card taller without changing its margins or type", () => {
    const square = layoutCard(1080, "1:1");
    const tall = layoutCard(1080, "3:4");
    assert.equal(tall.height, 1440);
    // Every length is a fraction of WIDTH, so a 3:4 card keeps the same
    // margins and the same type size and simply gets a taller photo.
    assert.equal(square.photo.x, tall.photo.x);
    assert.equal(square.plate.h, tall.plate.h);
    assert.ok(tall.photo.h > square.photo.h);
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
    const fr = shareCaption("fr");
    const en = shareCaption("en");
    assert.ok(fr.includes("#DevFestYaounde"));
    assert.ok(en.includes("#DevFestYaounde"));
    assert.notEqual(fr, en, "the two locales must not share one string");
  });

  it("points the caption at the generator, and names no accounts", () => {
    for (const caption of [shareCaption("fr"), shareCaption("en")]) {
      assert.ok(
        caption.includes("/dp-generator"),
        "the CTA has to name the page people are being sent to",
      );
      // Handles are deliberately absent — none are confirmed (GAPS.md G16),
      // and a wrong one tags a stranger on every post.
      assert.ok(
        !/(^|\s)@\w/.test(caption),
        `caption names an account: ${caption}`,
      );
    }
  });
});

describe("refund acknowledgment as evidence", () => {
  it("is required by both checkout schemas", () => {
    const ticket = {
      attendees: [
        {
          tierId: "sonnet",
          name: "Ada Nkeng",
          email: "ada@example.com",
          apparelSize: "M",
        },
      ],
      contact: { email: "ada@example.com" },
      locale: "fr",
    };
    // A body without the acknowledgment is refused outright — the checkbox
    // used to gate only the button, so a direct POST simply skipped it.
    assert.equal(ticketCheckoutSchema.safeParse(ticket).success, false);
    assert.equal(
      ticketCheckoutSchema.safeParse({ ...ticket, acceptedTerms: true })
        .success,
      true,
    );

    // `false` is not "declined and continue" — it is refused like an absence.
    assert.equal(
      ticketCheckoutSchema.safeParse({ ...ticket, acceptedTerms: false })
        .success,
      false,
    );

    const shop = {
      cart: [{ productId: "sticker-pack", quantity: 1 }],
      contact: { email: "ada@example.com" },
      locale: "en",
    };
    assert.equal(shopCheckoutSchema.safeParse(shop).success, false);
    assert.equal(
      shopCheckoutSchema.safeParse({ ...shop, acceptedTerms: true }).success,
      true,
    );
  });

  it("records the wording the screen actually showed, per kind and locale", () => {
    // Tickets and goods carry different terms, and always did: a ticket is
    // not refundable at all, goods can be replaced when they arrive wrong.
    // Storing the ticket wording against a shop order would be false evidence.
    const ticketsFr = refundAcknowledgment("tickets", "fr");
    const ticketsEn = refundAcknowledgment("tickets", "en");
    const shopFr = refundAcknowledgment("shop", "fr");

    assert.notEqual(
      ticketsFr,
      ticketsEn,
      "each locale records its own wording",
    );
    assert.notEqual(ticketsFr, shopFr, "tickets and goods differ");
    for (const text of [ticketsFr, ticketsEn, shopFr]) {
      assert.ok(text.trim().length > 10, "wording must be the real sentence");
    }
  });

  it("fails loudly rather than recording a placeholder", () => {
    assert.throws(
      () => refundAcknowledgment("tickets", "de" as never),
      /refund acknowledgment copy/,
    );
  });
});

describe("buyer-requested fulfilment", () => {
  const base = {
    cart: [{ productId: "sticker-pack", quantity: 1 }],
    acceptedTerms: true as const,
    contact: { email: "ada@example.com" },
    locale: "fr" as const,
  };

  it("is optional — an order without a preference is still valid", () => {
    assert.equal(shopCheckoutSchema.safeParse(base).success, true);
  });

  it("accepts the two methods organisers already write", () => {
    // `shipping`, not `delivery`: PATCH /api/orders/:id/status has used these
    // two words since 0001, and two vocabularies for one column would drift.
    for (const method of ["pickup", "shipping"]) {
      assert.equal(
        shopCheckoutSchema.safeParse({ ...base, fulfilment: { method } })
          .success,
        true,
        method,
      );
    }
    assert.equal(
      shopCheckoutSchema.safeParse({ ...base, fulfilment: { method: "drone" } })
        .success,
      false,
    );
  });

  it("bounds the note instead of taking whatever is pasted in", () => {
    assert.equal(
      fulfilmentRequestSchema.safeParse({
        method: "shipping",
        note: "x".repeat(300),
      }).success,
      true,
    );
    assert.equal(
      fulfilmentRequestSchema.safeParse({
        method: "shipping",
        note: "x".repeat(301),
      }).success,
      false,
    );
  });

  it("is not offered on the ticket flow", () => {
    // Nothing is delivered for a ticket, and startCheckout drops the field
    // for that kind anyway — so the schema should not invite it either.
    const parsed = ticketCheckoutSchema.safeParse({
      attendees: [
        {
          tierId: "sonnet",
          name: "Ada Nkeng",
          email: "ada@example.com",
          apparelSize: "M",
        },
      ],
      acceptedTerms: true,
      contact: { email: "ada@example.com" },
      locale: "fr",
      fulfilment: { method: "shipping" },
    });
    assert.equal(parsed.success, true, "unknown keys are stripped, not fatal");
    assert.ok(
      !("fulfilment" in (parsed.success ? parsed.data : {})),
      "a fulfilment sent with tickets must not survive parsing",
    );
  });
});

describe("per-variant stock", () => {
  it("keys a combination the same way everywhere", () => {
    // The JSON, the SQL and the UI all count under this string. Two spellings
    // of one combination would silently split a stock figure in half.
    assert.equal(
      variantKey("tee-edition", { size: "M", color: "Noir" }),
      "tee-edition|M|Noir",
    );
    assert.equal(variantKey("sticker-pack"), "sticker-pack||");
    assert.equal(
      variantKey("tee-edition", { size: "M" }),
      variantKey("tee-edition", { size: "M", color: undefined }),
    );
  });

  it("only caps the combinations the catalog names", () => {
    const caps = variantCapacities();
    assert.equal(typeof caps["tee-edition|M|Noir"], "number");
    // A product with no variants and no stock entry stays unlimited.
    assert.equal(caps["sticker-pack||"], undefined);
    assert.equal(declaredStock("sticker-pack"), undefined);
  });

  it("refuses an order larger than a combination ever had", async () => {
    // XXL/Blanc is stocked at 0 — the fixture's deliberately sold-out size.
    assert.equal(
      declaredStock("tee-edition", { size: "XXL", color: "Blanc" }),
      0,
    );

    await rejectsWith(
      quoteCart([
        {
          productId: "tee-edition",
          quantity: 1,
          variant: { size: "XXL", color: "Blanc" },
        },
      ]),
      CHECKOUT_ERRORS.VARIANT_SOLD_OUT,
    );
  });

  it("still prices a combination that has room", async () => {
    const basket = await quoteCart([
      {
        productId: "tee-edition",
        quantity: 2,
        variant: { size: "M", color: "Noir" },
      },
    ]);
    assert.equal(basket.charged, findProduct("tee-edition")!.priceXAF * 2);
  });

  it("leaves an unstocked product unlimited", async () => {
    const basket = await quoteCart([
      { productId: "sticker-pack", quantity: 10 },
    ]);
    assert.equal(basket.lines[0].quantity, 10);
  });
});

describe("ticket ownership", () => {
  const attendee = (over = {}) => ({
    tierId: "sonnet",
    name: "Ada Nkeng",
    email: "ada@example.com",
    apparelSize: "M",
    ...over,
  });
  const order = (attendees: unknown[]) => ({
    attendees,
    acceptedTerms: true as const,
    contact: { email: "ada@example.com" },
    locale: "fr" as const,
  });

  it("accepts an order where nobody claims a ticket", () => {
    // Buying for other people only is normal — a team lead, a parent.
    assert.equal(
      ticketCheckoutSchema.safeParse(order([attendee()])).success,
      true,
    );
  });

  it("records the one the buyer kept", () => {
    const parsed = ticketCheckoutSchema.safeParse(
      order([attendee({ isSelf: true }), attendee({ name: "Ben Fouda" })]),
    );
    assert.equal(parsed.success, true);
    assert.equal(parsed.success && parsed.data.attendees[0].isSelf, true);
    assert.equal(parsed.success && parsed.data.attendees[1].isSelf, undefined);
  });

  it("refuses two, because you can only be one person", () => {
    // The screen prevents it by unsetting the others, so a body with two is
    // either a bug or hand-written — either way it should not be stored.
    assert.equal(
      ticketCheckoutSchema.safeParse(
        order([attendee({ isSelf: true }), attendee({ isSelf: true })]),
      ).success,
      false,
    );
  });
});

describe("community wall", () => {
  it("keeps only a hash of the takedown token", () => {
    const { token, hash } = mintDeletionToken();
    // The token is returned to the browser once; the row keeps this instead,
    // for the same reason a password is never stored in the clear.
    assert.notEqual(token, hash);
    assert.equal(hash, hashToken(token));
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.ok(token.length >= 30, "a guessable token is not proof of anything");
  });

  it("matches a token only against its own hash", () => {
    const a = mintDeletionToken();
    const b = mintDeletionToken();
    assert.ok(tokensMatch(hashToken(a.token), a.hash));
    assert.ok(!tokensMatch(hashToken(b.token), a.hash));
    // Different lengths must not throw — timingSafeEqual would.
    assert.ok(!tokensMatch("short", a.hash));
  });

  it("mints a different token every time", () => {
    const seen = new Set(
      Array.from({ length: 50 }, () => mintDeletionToken().token),
    );
    assert.equal(seen.size, 50);
  });

  it("records the wording the person was actually shown", () => {
    // Not taken from the request: this record is what says someone agreed to
    // their FACE being public, so a forged body must not be able to write it.
    const fr = galleryConsentText("fr");
    const en = galleryConsentText("en");
    assert.notEqual(fr, en);
    for (const text of [fr, en]) assert.ok(text.trim().length > 20);
  });

  it("fails loudly on a missing translation rather than storing a blank", () => {
    assert.throws(() => galleryConsentText("de" as never), /wall consent copy/);
  });

  it("caps the server side above what the client sends", () => {
    // The client downscales to 640; the server refuses anything over 800, so
    // a hand-rolled upload cannot smuggle a full-resolution face in.
    assert.ok(MAX_EDGE >= GALLERY_MAX_EDGE);
    assert.ok(MAX_BYTES <= 400 * 1024);
  });

  it("stays dark until the flag is set", () => {
    const saved = process.env.NEXT_PUBLIC_DP_GALLERY;
    delete process.env.NEXT_PUBLIC_DP_GALLERY;
    assert.equal(galleryEnabled(), false);
    process.env.NEXT_PUBLIC_DP_GALLERY = "1";
    assert.equal(galleryEnabled(), true);
    if (saved === undefined) delete process.env.NEXT_PUBLIC_DP_GALLERY;
    else process.env.NEXT_PUBLIC_DP_GALLERY = saved;
  });
});

describe("wall retention", () => {
  it("keeps a wall up for a full edition cycle, not forever", () => {
    // 200 days: an edition's wall is still there months later, and faces from
    // one year are gone before the next-but-one comes round.
    assert.equal(DEFAULT_RETENTION_DAYS, 200);
    assert.ok(DEFAULT_RETENTION_DAYS > 180, "must outlast the event itself");
    assert.ok(DEFAULT_RETENTION_DAYS < 730, "must not become indefinite");
  });

  it("does nothing at all while the wall is switched off", async () => {
    // No flag means no wall, so a purge would be touching a table nobody is
    // using — and would need database access this test has no business having.
    const saved = process.env.NEXT_PUBLIC_DP_GALLERY;
    delete process.env.NEXT_PUBLIC_DP_GALLERY;
    const report = await purgeExpiredCards();
    assert.deepEqual(report, { expired: 0, errors: 0 });
    if (saved !== undefined) process.env.NEXT_PUBLIC_DP_GALLERY = saved;
  });
});
