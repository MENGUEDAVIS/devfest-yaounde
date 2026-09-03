"use client";

import type { AdminData } from "@/lib/admin/shape";
import type { ContentCounts } from "../AdminShell";
import { Panel, money } from "./shared";

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
    <div className="rounded-lg border-2 border-black02 bg-offwhite p-4">
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

export function AdminOverview({
  data,
  content,
  onGo,
}: {
  data: AdminData;
  content: ContentCounts;
  onGo: (v: "tickets" | "orders" | "wall") => void;
}) {
  const c = data.counts;
  return (
    <div className="flex flex-col gap-5">
      <Panel title="At a glance" subtitle="Live from the database.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <Stat label="Shop orders" value={String(c.orders)} />
          <Stat
            label="Settled revenue"
            value={money(c.settledRevenue, "XAF")}
            note="Net of discounts, activated payments only"
          />
          <Stat label="Signed-in users" value={String(c.users)} />
          <Stat
            label="Wall — live"
            value={data.wallEnabled ? String(c.wallApproved) : "off"}
          />
          <Stat
            label="Wall — waiting"
            value={data.wallEnabled ? String(c.wallPending) : "off"}
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
            note="Across every collection"
          />
        </div>
      </Panel>

      {/*
        Said out loud rather than shown as an empty table.

        The free tier RSVPs on Bevy and never touches this system: there is no
        row to count. A "free tickets" figure here would be permanently zero
        and would read as "nobody signed up", which is worse than not showing
        it — a dashboard that quietly reports a number it cannot know is how
        someone plans catering for the wrong crowd.
      */}
      <Panel
        title="What this dashboard cannot tell you"
        subtitle="Two numbers live somewhere else, and are not guessed at here."
      >
        <ul className="flex flex-col gap-3 text-body-m text-black02">
          <li className="rounded-lg border-2 border-black02 bg-pastel p-4">
            <strong className="font-bold">Free-pass RSVPs are on Bevy.</strong>{" "}
            The free tier redirects there and never reaches this system, so
            there is no row to count. Read them on the Bevy event page; showing
            a zero here would look like nobody came.
          </li>
          <li className="rounded-lg border-2 border-black02 bg-pastel p-4">
            <strong className="font-bold">
              Nobody&apos;s actions are logged.
            </strong>{" "}
            Order and moderation changes leave a changed row but no record of
            who made it (GAPS.md G22).
          </li>
        </ul>
      </Panel>

      <Panel
        title="Jump to"
        subtitle="The things most often needed on the day."
      >
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
              className="rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 hover:bg-primary"
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
