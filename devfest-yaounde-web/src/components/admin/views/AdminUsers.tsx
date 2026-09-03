"use client";

import { LIST_CAP, type AdminData } from "@/lib/admin/shape";
import { DataTable, Panel, maskEmail, when } from "./shared";

export function AdminUsers({ data }: { data: AdminData }) {
  return (
    <Panel
      title="Users who have signed in"
      subtitle={`Showing ${data.users.rows.length} of ${data.users.total}${
        data.users.total > LIST_CAP ? ` (first ${LIST_CAP} loaded)` : ""
      }.`}
    >
      {/*
        PII restraint, and the reasoning rather than a blanket rule.

        This list is for browsing — "how many people have accounts", "did this
        person ever sign in" — and nobody is contacted from it, so addresses
        are masked. Where an address IS the point of the row, on a ticket to
        email or an order to fulfil, it is shown in full: masking it there
        would only mean someone copies it out of the database instead, which
        is worse. There is no export here for the same reason — a CSV of every
        member's address is not a thing this dashboard needs to be able to
        produce in one click.

        No tokens, no session data, no IP addresses. `profiles` holds none of
        those; the DP wall's `submitter_ip` is never read into this dashboard.
      */}
      <DataTable
        headers={["Name", "Email", "Signed up"]}
        empty="Nobody has signed in yet."
        rows={data.users.rows.map((u) => [
          u.displayName ?? "—",
          <span key="e" className="font-mono text-caption">
            {maskEmail(u.email)}
          </span>,
          when(u.createdAt),
        ])}
      />
    </Panel>
  );
}
