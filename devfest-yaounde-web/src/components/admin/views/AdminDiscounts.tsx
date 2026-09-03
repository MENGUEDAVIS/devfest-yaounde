"use client";

import { useState } from "react";
import type { AdminData } from "@/lib/admin/shape";
import { DataTable, Panel, when } from "./shared";

export function AdminDiscounts({ data }: { data: AdminData }) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [appliesTo, setAppliesTo] = useState<"tickets" | "shop" | "both">(
    "both",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        kind,
        value: Number(value),
        appliesTo,
        active: true,
      }),
    });
    if (res.status === 409) {
      setStatus("error");
      setError("That code already exists.");
      return;
    }
    if (!res.ok) {
      setStatus("error");
      setError("Could not create the code. Check the fields.");
      return;
    }
    setStatus("saved");
    setCode("");
  }

  async function toggle(existing: string, active: boolean) {
    setBusy(existing);
    await fetch(`/api/admin/discounts/${existing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setBusy(null);
  }

  const field =
    "rounded-lg border-2 border-black02 bg-offwhite px-3 py-2 font-sans text-body-m text-black02";

  return (
    <div className="flex flex-col gap-5">
      <Panel title="New discount code">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-caption font-bold uppercase tracking-wide text-black02/70">
            Code
            <input
              className={`${field} mt-1 block font-mono`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GDG2026"
            />
          </label>
          <label className="text-caption font-bold uppercase tracking-wide text-black02/70">
            Kind
            <select
              className={`${field} mt-1 block`}
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
            >
              <option value="percent">percent</option>
              <option value="fixed">fixed XAF</option>
            </select>
          </label>
          <label className="text-caption font-bold uppercase tracking-wide text-black02/70">
            Value
            <input
              className={`${field} mt-1 block w-24`}
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="text-caption font-bold uppercase tracking-wide text-black02/70">
            Applies to
            <select
              className={`${field} mt-1 block`}
              value={appliesTo}
              onChange={(e) =>
                setAppliesTo(e.target.value as "tickets" | "shop" | "both")
              }
            >
              <option value="both">both</option>
              <option value="tickets">tickets</option>
              <option value="shop">shop</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void create()}
            disabled={status === "saving"}
            className="rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Create"}
          </button>
        </div>
        {status === "saved" && (
          <p className="mt-3 text-body-m font-bold text-black02">
            Created. Reload to see it in the list.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}
      </Panel>

      <Panel
        title="Discount codes"
        subtitle="Live from the database, including how many times each has been redeemed."
      >
        <DataTable
          headers={[
            "Code",
            "Kind",
            "Value",
            "Applies to",
            "Redeemed",
            "Active",
            "Expires",
            "",
          ]}
          empty="No discount codes."
          rows={data.discounts.map((d) => [
            <span key="c" className="font-mono font-bold">
              {d.code}
            </span>,
            d.kind,
            d.kind === "percent" ? `${d.value}%` : `${d.value} XAF`,
            d.appliesTo,
            `${d.redeemedCount}${d.maxRedemptions ? ` / ${d.maxRedemptions}` : ""}`,
            d.active ? "Yes" : "No",
            when(d.expiresAt),
            <button
              key="t"
              type="button"
              disabled={busy === d.code}
              onClick={() => void toggle(d.code, d.active)}
              className="rounded-pill border-2 border-black02 px-3 py-1 text-caption font-bold"
            >
              {d.active ? "Disable" : "Enable"}
            </button>,
          ])}
        />
      </Panel>
    </div>
  );
}
