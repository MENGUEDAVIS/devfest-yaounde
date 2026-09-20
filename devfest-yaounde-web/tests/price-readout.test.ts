import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { PriceReadout } from "@/components/admin/forms/PriceReadout";
import { feeInclusiveAmount } from "@/lib/payments/fees";

/**
 * PriceReadout is a pure function component, so it is called directly and its
 * element tree read for text. (`react-dom/server` is not available under the
 * `react-server` condition this suite runs with — and would be overkill for
 * asserting what a label and a number say.)
 */
const collect = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return ` ${node} `;
  if (Array.isArray(node)) return node.map(collect).join("");
  const el = node as { props?: { children?: ReactNode } };
  return collect(el.props?.children);
};
const show = (props: { base: number; layout?: "inline" | "panel" }) =>
  collect(PriceReadout(props)).replace(/\s+/g, " ").trim();
const fmt = (n: number) => `${n.toLocaleString("en-CM")} XAF`;

describe("the admin's base / displayed price readout", () => {
  it("shows both prices, labelled, in a list row", () => {
    const out = show({ base: 3500 });
    assert.match(out, /Base/);
    assert.match(out, /Displayed/);
    assert.ok(out.includes(fmt(3500)), out);
    assert.ok(out.includes(fmt(3600)), out); // 3500 * 1.015 = 3552.5 -> 3600
    assert.ok(out.indexOf("Base") < out.indexOf("Displayed"));
  });

  it("shows both prices, with what each one means, in the edit form", () => {
    const out = show({ base: 5000, layout: "panel" });
    assert.match(out, /Base price — what you enter/);
    assert.match(out, /Displayed price — what visitors pay/);
    assert.ok(out.includes(fmt(5000)) && out.includes(fmt(5100)), out);
    assert.match(out, /rounded up to the next 50 XAF \(100 XAF on top\)/);
  });

  it("is the SAME number the storefront and checkout use, for any base", () => {
    for (const base of [1, 100, 2000, 2500, 10000, 12345, 25000]) {
      const out = show({ base });
      assert.ok(out.includes(fmt(feeInclusiveAmount(base))), `${base}: ${out}`);
    }
  });

  it("says Free for both, with no fee, when the base is zero", () => {
    const row = show({ base: 0 });
    assert.equal((row.match(/Free/g) ?? []).length, 2, row);
    const panel = show({ base: 0, layout: "panel" });
    assert.match(panel, /stays free/);
    assert.ok(!panel.includes("XAF on top"), panel);
  });
});
