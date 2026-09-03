"use client";

import { useState } from "react";
import type { AdminData, AdminOrder } from "@/lib/admin/shape";
import { DataTable, ExportButton, Panel, money, when } from "./shared";

const NEXT_STATUS: Record<string, string[]> = {
  processing: ["ready_for_pickup", "shipped", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * The one place this dashboard writes.
 *
 * It goes through `PATCH /api/orders/:id/status`, which already exists and
 * does its own organiser check and its own transition validation against the
 * order's CURRENT status. That is the whole reason no new endpoint was added:
 * the write, the authorisation and the rules were already built, and a second
 * path to the same table would be a second place to get them wrong.
 */
function OrderRow({
  order,
  onDone,
}: {
  order: AdminOrder;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(status: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Failed (${response.status})`);
      } else {
        onDone();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  const options = NEXT_STATUS[order.status] ?? [];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {options.length === 0 ? (
        <span className="text-black02/60">—</span>
      ) : (
        options.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void move(s)}
            className="rounded-pill border-2 border-black02 bg-offwhite px-3 py-1 font-sans text-caption font-bold text-black02 hover:bg-primary disabled:opacity-40"
          >
            {s.replace(/_/g, " ")}
          </button>
        ))
      )}
      {error && (
        <span className="text-caption font-bold text-danger">{error}</span>
      )}
    </span>
  );
}

export function AdminOrders({ data }: { data: AdminData }) {
  const [refreshed, setRefreshed] = useState(false);
  const rows = data.orders.rows;

  return (
    <Panel
      title="Shop orders"
      subtitle={`Showing ${rows.length} of ${data.orders.total}. Moving an order along writes through the existing organiser endpoint.`}
      action={
        <ExportButton
          filename="devfest-orders.csv"
          headers={["Order", "Status", "Total", "Items", "When"]}
          rows={rows.map((o) => [
            o.id,
            o.status,
            o.totalAmount,
            o.items.map((i) => `${i.quantity}x ${i.name}`).join("; "),
            o.createdAt,
          ])}
        />
      }
    >
      {refreshed && (
        <p className="mb-4 rounded-lg border-2 border-black02 bg-primary px-4 py-2.5 text-body-m font-bold text-black02">
          Saved. Reload the page to see the new status — this view was rendered
          once, and does not poll.
        </p>
      )}
      <DataTable
        headers={["Order", "Status", "Total", "Items", "When", "Move to"]}
        empty="No orders yet."
        rows={rows.map((o) => [
          <span key="i" className="font-mono text-caption">
            {o.id.slice(0, 8)}…
          </span>,
          <span key="s" className="font-bold">
            {o.status.replace(/_/g, " ")}
          </span>,
          money(o.totalAmount, o.currency),
          <span key="it" className="text-caption">
            {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "—"}
          </span>,
          when(o.createdAt),
          <OrderRow key="a" order={o} onDone={() => setRefreshed(true)} />,
        ])}
      />
    </Panel>
  );
}
