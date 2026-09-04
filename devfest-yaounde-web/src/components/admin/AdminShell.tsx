"use client";

import {
  ArrowLeft,
  ChartBar,
  Gear,
  Image as ImageIcon,
  Package,
  Percent,
  Receipt,
  Table,
  Ticket,
  Users,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { AdminData, AdminSettings, MissingPhoto } from "@/lib/admin/shape";
import { AdminOverview } from "./views/AdminOverview";
import { AdminTickets } from "./views/AdminTickets";
import { AdminTransactions } from "./views/AdminTransactions";
import { AdminOrders } from "./views/AdminOrders";
import { AdminDiscounts } from "./views/AdminDiscounts";
import { AdminUsers } from "./views/AdminUsers";
import { AdminContent } from "./views/AdminContent";
import { AdminWall } from "./views/AdminWall";
import { AdminConfig } from "./views/AdminConfig";
import { PageHeader } from "./views/shared";

export interface ContentCounts {
  speakers: number;
  team: number;
  sessions: number;
  sponsors: number;
  faqs: number;
  products: number;
  tiers: number;
}

export type ViewId =
  | "overview"
  | "tickets"
  | "transactions"
  | "orders"
  | "discounts"
  | "wall"
  | "users"
  | "content"
  | "config";

const GROUPS: {
  label: string;
  items: {
    id: ViewId;
    label: string;
    Icon: typeof ChartBar;
  }[];
}[] = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "At a glance", Icon: ChartBar }],
  },
  {
    label: "Commerce",
    items: [
      { id: "tickets", label: "Tickets", Icon: Ticket },
      { id: "transactions", label: "Transactions", Icon: Receipt },
      { id: "orders", label: "Shop orders", Icon: Package },
      { id: "discounts", label: "Discounts", Icon: Percent },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "wall", label: "DP wall", Icon: ImageIcon },
      { id: "users", label: "Users", Icon: Users },
    ],
  },
  {
    label: "Content",
    items: [{ id: "content", label: "Collections", Icon: Table }],
  },
  {
    label: "Settings",
    items: [{ id: "config", label: "Info bar & policies", Icon: Gear }],
  },
];

const VIEW_IDS: ViewId[] = GROUPS.flatMap((group) =>
  group.items.map((item) => item.id),
);

const HEADERS: Record<ViewId, { title: string; blurb: string }> = {
  overview: {
    title: "Overview",
    blurb: "Where the edition stands today — tickets, money, wall, content.",
  },
  tickets: {
    title: "Tickets",
    blurb: "Everyone who has a badge code. Check-in still happens at the door.",
  },
  transactions: {
    title: "Transactions",
    blurb: "Payment intents as PawaPay reported them, including failures.",
  },
  orders: {
    title: "Shop orders",
    blurb: "Fulfilment for merch. Move a row along when you pack it.",
  },
  discounts: {
    title: "Discount codes",
    blurb: "Create a code, disable one. Redemptions are not editable.",
  },
  wall: {
    title: "Community wall",
    blurb: "Click a card to hide or show it. Reported ones sit up front.",
  },
  users: {
    title: "Users",
    blurb: "People who signed in with Google. Addresses are masked here.",
  },
  content: {
    title: "Content",
    blurb: "Publish JSON or a names CSV, then attach photos per profile.",
  },
  config: {
    title: "Info bar and policies",
    blurb: "Announcement, privacy, code of conduct, and the Bevy URL.",
  },
};

function parseView(raw: string | null): ViewId {
  if (raw && (VIEW_IDS as string[]).includes(raw)) return raw as ViewId;
  return "overview";
}

/**
 * The dashboard shell: grouped sidebar, URL-anchored view, back to the site.
 *
 * View lives in `?view=` so a reload keeps the place. The swap is still
 * client-side — no full reload, no second authorisation.
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = parseView(params.get("view"));

  useEffect(() => {
    document.title = "Admin · DevFest Yaoundé";
  }, []);

  function go(id: ViewId) {
    const next = new URLSearchParams(params.toString());
    if (id === "overview") next.delete("view");
    else next.set("view", id);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  const header = HEADERS[view];

  return (
    <div className="min-h-screen bg-pastel px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:sticky lg:top-5 lg:h-fit lg:w-56">
          <div className="rounded-lg border border-black02/20 bg-offwhite p-4">
            <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50">
              DevFest admin
            </p>
            <p className="mt-1 truncate text-body-m font-bold text-black02">
              {data.organiserEmail ?? "Organiser"}
            </p>

            <nav className="mt-5 flex flex-col gap-4">
              {GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-3 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/40">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1 lg:flex-col">
                    {group.items.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => go(id)}
                        aria-current={view === id ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-pill px-3 py-2 text-left font-sans text-body-m transition-colors ${
                          view === id
                            ? "bg-primary font-bold text-black02"
                            : "font-medium text-black02/70 hover:bg-pastel hover:text-black02"
                        }`}
                      >
                        <Icon size={16} weight="bold" aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-3 py-2 font-sans text-body-m font-bold text-black02/70 hover:text-black02"
            >
              <ArrowLeft size={16} weight="bold" aria-hidden />
              Back to site
            </Link>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-16">
          <PageHeader title={header.title} blurb={header.blurb} />
          {view === "overview" && (
            <AdminOverview data={data} content={content} onGo={go} />
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
