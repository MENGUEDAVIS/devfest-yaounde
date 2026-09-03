"use client";

import { useState } from "react";
import { LIST_CAP, type AdminData } from "@/lib/admin/shape";
import { DataTable, ExportButton, Panel, when } from "./shared";

export function AdminTickets({ data }: { data: AdminData }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = data.tickets.rows.filter(
    (t) =>
      !needle ||
      t.attendeeName.toLowerCase().includes(needle) ||
      t.attendeeEmail.toLowerCase().includes(needle) ||
      t.badgeCode.toLowerCase().includes(needle) ||
      t.tierId.toLowerCase().includes(needle),
  );

  return (
    <Panel
      title="Paid tickets"
      subtitle={`Showing ${rows.length} of ${data.tickets.total}${
        data.tickets.total > LIST_CAP ? ` (first ${LIST_CAP} loaded)` : ""
      }. Free passes are on Bevy and are not here.`}
      action={
        <ExportButton
          filename="devfest-tickets.csv"
          headers={[
            "Badge code",
            "Name",
            "Email",
            "Tier",
            "Size",
            "Checked in",
            "Bought",
          ]}
          rows={rows.map((t) => [
            t.badgeCode,
            t.attendeeName,
            t.attendeeEmail,
            t.tierId,
            t.apparelSize ?? "",
            t.checkedInAt ?? "",
            t.createdAt,
          ])}
        />
      }
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, badge code or tier"
        className="mb-4 w-full max-w-md rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-sans text-body-m text-black02"
      />
      <DataTable
        headers={["Badge", "Attendee", "Tier", "Size", "Checked in", "Bought"]}
        empty="No tickets match."
        rows={rows.map((t) => [
          <span key="b" className="font-mono text-mono-tag">
            {t.badgeCode}
          </span>,
          <span key="a">
            <span className="font-bold">{t.attendeeName}</span>
            <br />
            {/* Full address: this row exists to be contacted. */}
            <span className="text-caption text-black02/70">
              {t.attendeeEmail}
            </span>
          </span>,
          t.tierId,
          t.apparelSize ?? "—",
          t.checkedInAt ? when(t.checkedInAt) : "—",
          when(t.createdAt),
        ])}
      />
    </Panel>
  );
}
