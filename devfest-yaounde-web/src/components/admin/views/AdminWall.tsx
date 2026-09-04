"use client";

import { useState } from "react";
import type { AdminData, AdminWallReport } from "@/lib/admin/shape";
import { DataTable, Panel, ReadOnlyNotice, when } from "./shared";

export function AdminWall({ data }: { data: AdminData }) {
  const [reports, setReports] = useState<AdminWallReport[]>(data.wallReports);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data.wallEnabled) {
    return (
      <Panel title="Community wall" subtitle="Currently switched off.">
        <ReadOnlyNotice>
          `NEXT_PUBLIC_DP_GALLERY=0` is set, so no card can be submitted and the
          endpoints answer 404. Remove it (or set it to 1) to switch the wall
          back on. See ADR 0033.
        </ReadOnlyNotice>
      </Panel>
    );
  }

  async function remove(cardId: string) {
    setBusy(cardId);
    setError(null);
    const res = await fetch(`/api/dp/gallery/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (!res.ok) {
      setError("Could not take that card down.");
      setBusy(null);
      return;
    }
    setReports((prev) =>
      prev.map((row) =>
        row.cardId === cardId
          ? { ...row, status: "rejected", imageUrl: null }
          : row,
      ),
    );
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Community wall"
        subtitle={`${data.counts.wallApproved} live, ${data.counts.wallPending} waiting, ${reports.length} reported.`}
      >
        <p className="text-body-m text-black02/80">
          Cards publish on arrival (ADR 0027). Someone still has to watch:
          reject deletes the image, not just the row. Do not leave a card of a
          child up.
        </p>
      </Panel>

      <Panel
        title="Reported cards"
        subtitle="A visitor flagged these. Remove takes the picture down for everyone."
      >
        {error && (
          <p className="mb-3 rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}
        <DataTable
          headers={["Card", "Nickname", "Status", "Reported", ""]}
          empty="Nothing reported. Keep an eye on the public wall anyway."
          rows={reports.map((row) => [
            row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key="img"
                src={row.imageUrl}
                alt=""
                className="h-16 w-16 rounded-md border-2 border-black02 object-cover"
              />
            ) : (
              <span key="gone" className="text-black02/50">
                —
              </span>
            ),
            <span key="n" className="font-bold">
              {row.nickname}
            </span>,
            row.status,
            when(row.createdAt),
            <button
              key="r"
              type="button"
              disabled={busy === row.cardId || row.status === "rejected"}
              onClick={() => void remove(row.cardId)}
              className="rounded-pill border-2 border-black02 px-3 py-1 text-caption font-bold disabled:opacity-50"
            >
              {row.status === "rejected" ? "Removed" : "Remove"}
            </button>,
          ])}
        />
      </Panel>
    </div>
  );
}
