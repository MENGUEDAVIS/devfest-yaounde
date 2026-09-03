"use client";

import type { AdminData } from "@/lib/admin/shape";
import { DataTable, ExportButton, Panel, money, when } from "./shared";

/** `activated` means the money landed AND the tickets or order were created. */
const STATUS_LABEL: Record<string, string> = {
  activated: "Settled",
  pending: "Awaiting payment",
  failed: "Failed",
  amount_mismatch: "Amount mismatch",
};

export function AdminTransactions({ data }: { data: AdminData }) {
  const rows = data.transactions.rows;
  return (
    <Panel
      title="Transactions"
      subtitle={`Showing ${rows.length} of ${data.transactions.total}. "Settled" is the state that produced a ticket or an order.`}
      action={
        <ExportButton
          filename="devfest-transactions.csv"
          headers={[
            "Deposit",
            "Kind",
            "Status",
            "Charged",
            "Net",
            "Discount",
            "Code",
            "Failure",
            "When",
          ]}
          rows={rows.map((t) => [
            t.depositId,
            t.kind,
            t.status,
            t.chargedAmount,
            t.netAmount,
            t.discountAmount ?? 0,
            t.discountCode ?? "",
            t.failureCode ?? "",
            t.createdAt,
          ])}
        />
      }
    >
      <DataTable
        headers={[
          "Deposit",
          "Kind",
          "Status",
          "Charged",
          "Net",
          "Discount",
          "When",
        ]}
        empty="No transactions yet."
        rows={rows.map((t) => [
          <span key="d" className="font-mono text-caption">
            {t.depositId.slice(0, 12)}…
          </span>,
          t.kind,
          <span key="s" className="font-bold">
            {STATUS_LABEL[t.status] ?? t.status}
            {t.failureCode && (
              <span className="block text-caption font-normal text-danger">
                {t.failureCode}
              </span>
            )}
          </span>,
          money(t.chargedAmount, t.currency),
          money(t.netAmount, t.currency),
          t.discountCode
            ? `${t.discountCode} (−${t.discountAmount ?? 0})`
            : "—",
          when(t.createdAt),
        ])}
      />
    </Panel>
  );
}
