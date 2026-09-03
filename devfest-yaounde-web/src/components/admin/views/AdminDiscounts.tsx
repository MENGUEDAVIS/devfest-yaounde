"use client";

import type { AdminData } from "@/lib/admin/shape";
import { DataTable, Panel, ReadOnlyNotice, when } from "./shared";

export function AdminDiscounts({ data }: { data: AdminData }) {
  return (
    <Panel
      title="Discount codes"
      subtitle="Live from the database, including how many times each has been redeemed."
    >
      {/*
        The table is writable; there is simply no endpoint that writes it.
        Adding one means authoring backend — a route, an authz enforcement
        point, a schema — which this phase excludes. Saying that is more useful
        than a disabled button.
      */}
      <ReadOnlyNotice>
        Read-only. `discount_codes` is a real table, but no endpoint creates or
        edits one — changes are made in Supabase for now. This is the cheapest
        real gap to close: one organiser-guarded route, and this view already
        has the shape.
      </ReadOnlyNotice>
      <DataTable
        headers={[
          "Code",
          "Kind",
          "Value",
          "Applies to",
          "Redeemed",
          "Active",
          "Expires",
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
        ])}
      />
    </Panel>
  );
}
