"use client";

import type { AdminData } from "@/lib/admin/shape";
import type { ContentCounts, ViewId } from "../AdminShell";
import { EVENT, eventDates } from "@/lib/event";
import { AdminChart } from "./AdminChart";
import { InfoBanner, Panel, money } from "./shared";

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-black02/15 bg-offwhite p-4">
      <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
        {label}
      </p>
      <p className="mt-1 font-sans text-heading-l font-bold text-black02">
        {value}
      </p>
      {note && <p className="mt-1 text-caption text-black02/60">{note}</p>}
    </div>
  );
}

function seriesByDay(rows: { createdAt: string; amount?: number }[]): {
  labels: string[];
  values: number[];
} {
  const map = new Map<string, number>();
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + (row.amount ?? 1));
  }
  const labels = [...map.keys()].sort();
  return { labels, values: labels.map((day) => map.get(day) ?? 0) };
}

function countdownCopy(): { value: string; note: string } {
  const dates = eventDates();
  if (!dates) {
    return {
      value: "TBA",
      note: `${EVENT.year} dates are not confirmed — this is not a made-up day.`,
    };
  }
  const start = new Date(dates.start).getTime();
  const days = Math.max(0, Math.ceil((start - Date.now()) / 86_400_000));
  return {
    value: String(days),
    note: days === 1 ? "day to D-Day" : "days to D-Day",
  };
}

export function AdminOverview({
  data,
  content,
  onGo,
}: {
  data: AdminData;
  content: ContentCounts;
  onGo: (v: ViewId) => void;
}) {
  const c = data.counts;
  const dday = countdownCopy();
  const tickets = seriesByDay(data.tickets.rows);
  const revenue = seriesByDay(
    data.transactions.rows
      .filter((row) => row.status === "activated")
      .map((row) => ({ createdAt: row.createdAt, amount: row.netAmount })),
  );
  const orders = seriesByDay(data.orders.rows);
  const wall = seriesByDay(data.wallCards);

  return (
    <div className="flex flex-col gap-6">
      <InfoBanner>
        Free-pass RSVPs live on Bevy and never reach this system, so they are
        not counted here. A zero would look like nobody came.
      </InfoBanner>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="D-Day" value={dday.value} note={dday.note} />
        <Stat label="Paid tickets" value={String(c.paidTickets)} />
        <Stat
          label="Checked in"
          value={String(c.checkedIn)}
          note={
            c.paidTickets
              ? `${Math.round((c.checkedIn / c.paidTickets) * 100)}% of sold`
              : undefined
          }
        />
        <Stat
          label="Settled revenue"
          value={money(c.settledRevenue, "XAF")}
          note="Net of discounts, activated payments only"
        />
        <Stat label="Shop orders" value={String(c.orders)} />
        <Stat label="Signed-in users" value={String(c.users)} />
        <Stat
          label="Wall — live"
          value={data.wallEnabled ? String(c.wallApproved) : "off"}
        />
        <Stat
          label="Content records"
          value={String(
            content.speakers +
              content.team +
              content.sessions +
              content.sponsors +
              content.faqs +
              content.products +
              content.tiers,
          )}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Tickets over time"
          subtitle="Paid badges, by day created."
        >
          <AdminChart
            labels={tickets.labels}
            values={tickets.values}
            caption={
              tickets.labels.length
                ? "One point per day with a ticket."
                : "No tickets yet — the axis stays empty rather than invented."
            }
          />
        </Panel>
        <Panel title="Revenue" subtitle="Activated payments, net of discounts.">
          <AdminChart
            labels={revenue.labels}
            values={revenue.values}
            caption={
              revenue.labels.length
                ? "XAF received that day."
                : "No settled payments yet."
            }
          />
        </Panel>
        <Panel title="Shop orders" subtitle="Orders placed, by day.">
          <AdminChart
            labels={orders.labels}
            values={orders.values}
            caption={
              orders.labels.length
                ? "Orders opened that day."
                : "No orders yet."
            }
          />
        </Panel>
        <Panel title="DP cards" subtitle="Composed cards saved to the wall.">
          <AdminChart
            labels={wall.labels}
            values={wall.values}
            caption={
              wall.labels.length
                ? "Saves that day, including hidden ones."
                : "Nobody has saved a card yet."
            }
          />
        </Panel>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {(
          [
            ["tickets", "Find a ticket"],
            ["orders", "Move an order along"],
            ["wall", "Review the wall"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onGo(id)}
            className="rounded-pill border border-black02/30 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 hover:bg-primary"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
