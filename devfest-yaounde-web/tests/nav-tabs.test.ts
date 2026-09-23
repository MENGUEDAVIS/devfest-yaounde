import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NAV,
  NAV_TAB_KEYS,
  visibleTextLinks,
  type NavSettings,
} from "@/lib/nav-tabs";
import { settingsSchema } from "@/lib/content/schemas";

const hide = (...keys: (keyof NavSettings)[]): NavSettings => {
  const nav = { ...DEFAULT_NAV };
  for (const key of keys) nav[key] = false;
  return nav;
};

describe("navbar tab visibility", () => {
  it("shows every tab by default — what the site did before the setting existed", () => {
    assert.deepEqual(NAV_TAB_KEYS, [
      "schedule",
      "speakers",
      "faqs",
      "team",
      "shop",
      "tickets",
    ]);
    for (const key of NAV_TAB_KEYS) assert.equal(DEFAULT_NAV[key], true, key);
  });

  it("lists the text links in navbar order", () => {
    assert.deepEqual(
      visibleTextLinks(DEFAULT_NAV).map((l) => l.href),
      ["/schedule", "/speakers", "/faqs", "/team"],
    );
  });

  it("drops a hidden text link and keeps the order of the rest", () => {
    assert.deepEqual(
      visibleTextLinks(hide("speakers")).map((l) => l.key),
      ["schedule", "faqs", "team"],
    );
    assert.deepEqual(
      visibleTextLinks(hide("schedule", "team")).map((l) => l.key),
      ["speakers", "faqs"],
    );
  });

  it("can hide every text link", () => {
    assert.deepEqual(
      visibleTextLinks(hide("schedule", "speakers", "faqs", "team")),
      [],
    );
  });

  it("shop and tickets are the two buttons, not text links, and hide independently", () => {
    // They never appear in the text-link list, hidden or not.
    for (const nav of [
      DEFAULT_NAV,
      hide("shop"),
      hide("tickets"),
      hide("shop", "tickets"),
    ]) {
      const keys = visibleTextLinks(nav).map((l) => l.key);
      assert.ok(
        !keys.includes("shop" as never) && !keys.includes("tickets" as never),
      );
    }
  });
});

describe("saving the navigation setting", () => {
  const parse = (nav: unknown) => settingsSchema.safeParse({ nav }).success;

  it("accepts a full set of booleans, and null (back to the default)", () => {
    assert.equal(parse(DEFAULT_NAV), true);
    assert.equal(parse(hide("shop", "faqs")), true);
    assert.equal(parse(null), true);
  });

  it("does not touch the setting when it is not sent", () => {
    assert.equal(settingsSchema.safeParse({}).success, true);
    assert.equal(settingsSchema.safeParse({}).data?.nav, undefined);
  });

  it("refuses a partial group — saving replaces the whole column, so a missing key would silently un-hide a tab", () => {
    const { shop: _shop, ...partial } = DEFAULT_NAV;
    void _shop;
    assert.equal(parse(partial), false);
  });

  it("refuses unknown keys and non-boolean values", () => {
    assert.equal(parse({ ...DEFAULT_NAV, blog: true }), false);
    assert.equal(parse({ ...DEFAULT_NAV, shop: "false" }), false);
    assert.equal(parse({ ...DEFAULT_NAV, shop: 0 }), false);
    assert.equal(parse("hidden"), false);
  });
});
