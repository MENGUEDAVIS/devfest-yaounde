"use client";

import { useState } from "react";
import type { AdminData, AdminDiscount } from "@/lib/admin/shape";
import { DataTable, Panel, when } from "./shared";

const CODE_RE = /^[A-Z0-9-]{3,32}$/;

function parsedValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function createHint(
  code: string,
  kind: "percent" | "fixed",
  value: string,
): string | null {
  if (!code.trim())
    return "Pick a code — at least 3 letters, digits or hyphens.";
  if (!CODE_RE.test(code.trim())) {
    return "Codes are 3–32 characters: A–Z, 0–9, hyphens.";
  }
  const n = parsedValue(value);
  if (n === null) return "Value has to be a whole number of at least 1.";
  if (kind === "percent" && n > 100) {
    return "A percent off has to be between 1 and 100.";
  }
  return null;
}

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
  const [rows, setRows] = useState<AdminDiscount[]>(data.discounts);

  const hint = createHint(code, kind, value);
  const ready = hint === null;

  async function create() {
    if (!ready) return;
    const n = parsedValue(value);
    if (n === null) return;
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        kind,
        value: n,
        appliesTo,
        active: true,
      }),
    });
    const body = (await res.json().catch(() => null)) as
      (Partial<AdminDiscount> & { error?: string; detail?: string }) | null;
    if (res.status === 409) {
      setStatus("error");
      setError("That code already exists.");
      return;
    }
    if (!res.ok) {
      setStatus("error");
      setError(body?.detail ?? "Could not create the code. Check the fields.");
      return;
    }
    const created: AdminDiscount = {
      code: body?.code ?? code.trim().toUpperCase(),
      kind: body?.kind ?? kind,
      value: body?.value ?? n,
      appliesTo: body?.appliesTo ?? appliesTo,
      active: body?.active ?? true,
      redeemedCount: body?.redeemedCount ?? 0,
      maxRedemptions: body?.maxRedemptions ?? null,
      expiresAt: body?.expiresAt ?? null,
    };
    setRows((prev) =>
      [...prev.filter((row) => row.code !== created.code), created].sort(
        (a, b) => a.code.localeCompare(b.code),
      ),
    );
    setStatus("saved");
    setCode("");
  }

  async function toggle(existing: string, active: boolean) {
    setBusy(existing);
    setError(null);
    const res = await fetch(`/api/admin/discounts/${existing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      detail?: string;
    } | null;
    if (!res.ok) {
      setError(body?.detail ?? "Could not update that code.");
      setBusy(null);
      return;
    }
    setRows((prev) =>
      prev.map((row) =>
        row.code === existing ? { ...row, active: !active } : row,
      ),
    );
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
              max={kind === "percent" ? 100 : undefined}
              step={1}
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
            disabled={!ready || status === "saving"}
            title={hint ?? undefined}
            className="rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Create"}
          </button>
        </div>
        {hint && status !== "saving" && status !== "saved" && (
          <p className="mt-3 text-body-m text-black02/70">{hint}</p>
        )}
        {status === "saved" && (
          <p className="mt-3 text-body-m font-bold text-black02">
            Created. It is in the list below.
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
          rows={rows.map((d) => [
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
