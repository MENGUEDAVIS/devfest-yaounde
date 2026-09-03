"use client";

import {
  ChartBar,
  Package,
  Percent,
  Receipt,
  Table,
  Ticket,
  Users,
  Image as ImageIcon,
  Gear,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type {
  AdminData,
  AdminSettings,
  MissingPhoto,
} from "@/lib/admin/shape";
import { AdminOverview } from "./views/AdminOverview";
import { AdminTickets } from "./views/AdminTickets";
import { AdminTransactions } from "./views/AdminTransactions";
import { AdminOrders } from "./views/AdminOrders";
import { AdminDiscounts } from "./views/AdminDiscounts";
import { AdminUsers } from "./views/AdminUsers";
import { AdminContent } from "./views/AdminContent";
import { AdminWall } from "./views/AdminWall";
import { AdminConfig } from "./views/AdminConfig";

export interface ContentCounts {
  speakers: number;
  team: number;
  sessions: number;
  sponsors: number;
  faqs: number;
  products: number;
  tiers: number;
}

const VIEWS = [
  { id: "overview", label: "Overview", Icon: ChartBar },
  { id: "tickets", label: "Tickets", Icon: Ticket },
  { id: "transactions", label: "Transactions", Icon: Receipt },
  { id: "orders", label: "Shop orders", Icon: Package },
  { id: "discounts", label: "Discount codes", Icon: Percent },
  { id: "wall", label: "Community wall", Icon: ImageIcon },
  { id: "users", label: "Users", Icon: Users },
  { id: "content", label: "Content", Icon: Table },
  { id: "config", label: "Config", Icon: Gear },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

/**
 * The dashboard shell: a floating sidebar and a main region that swaps.
 *
 * Client-side view switching rather than a route per view. All the data is
 * already here from one server render, so a swap is instant — no spinner, no
 * round trip, nothing to re-authorise. On a phone at a door on venue wifi,
 * that difference is the whole experience.
 *
 * Utilitarian on purpose. It uses the site's border, radius and colour
 * language so it is recognisably the same product, but it is dense tables and
 * plain forms: readability and speed over spectacle, per §2d.
 */
export function AdminShell({
  data,
  content,
  settings,
  missingPhotos,
}: {
  data: AdminData;
  content: ContentCounts;
  settings: AdminSettings;
  missingPhotos: MissingPhoto[];
}) {
  const [view, setView] = useState<ViewId>("overview");

  /* Set here rather than in route metadata: a static title is resolved before
     the gate runs and ends up in the 404's payload. See layout.tsx. */
  useEffect(() => {
    document.title = "Admin · DevFest Yaoundé";
  }, []);

  return (
    <div className="min-h-screen bg-pastel px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-5 lg:flex-row">
        {/* Floating sidebar — the same panel language as the filter rail. */}
        <aside className="shrink-0 lg:sticky lg:top-5 lg:h-fit lg:w-60">
          <div className="rounded-lg border-2 border-black02 bg-offwhite p-4 shadow-[0_4px_0_0_var(--color-black02)]">
            <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
              DevFest admin
            </p>
            <p className="mt-1 truncate text-body-m font-bold text-black02">
              {data.organiserEmail ?? "Organiser"}
            </p>

            <nav className="mt-4 flex flex-wrap gap-1.5 lg:flex-col">
              {VIEWS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-pill px-3 py-2 text-left font-sans text-body-m font-bold transition-colors ${
                    view === id
                      ? "bg-primary text-black02"
                      : "text-black02/70 hover:bg-pastel hover:text-black02"
                  }`}
                >
                  <Icon size={18} weight="bold" aria-hidden />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {view === "overview" && (
            <AdminOverview data={data} content={content} onGo={setView} />
          )}
          {view === "tickets" && <AdminTickets data={data} />}
          {view === "transactions" && <AdminTransactions data={data} />}
          {view === "orders" && <AdminOrders data={data} />}
          {view === "discounts" && <AdminDiscounts data={data} />}
          {view === "wall" && <AdminWall data={data} />}
          {view === "users" && <AdminUsers data={data} />}
          {view === "content" && (
            <AdminContent content={content} initialMissing={missingPhotos} />
          )}
          {view === "config" && <AdminConfig settings={settings} />}
        </main>
      </div>
    </div>
  );
}
