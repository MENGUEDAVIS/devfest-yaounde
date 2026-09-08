"use client";

import {
  ArrowLeft,
  ChartBar,
  Gear,
  Image as ImageIcon,
  List,
  Package,
  Percent,
  Receipt,
  Table,
  Ticket,
  Users,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { lockScroll } from "@/lib/scroll-source";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
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
  const params = useSearchParams();
  // Seeded from the URL once, then owned here. Reading `params` on every
  // render would tie the view back to the router and undo the point below.
  const [view, setView] = useState<ViewId>(() => parseView(params.get("view")));

  /**
   * The sidebar as a real drawer on a phone.
   *
   * It used to be a rounded card sitting at the top of the page with the
   * sections wrapped into pills underneath it — always there, taking a screen
   * of height before any content, and not actually usable. On a small screen
   * it is now a full-bleed drawer behind a floating button, and the layout
   * below it starts at the top of the page where it belongs.
   */
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.title = "Admin · DevFest Yaoundé";
  }, []);

  /** From `lg` the sidebar is permanent, so none of the drawer rules apply. */
  const permanent = useMediaQuery("(min-width: 1024px)");
  const shown = permanent || drawerOpen;

  useEffect(() => {
    if (!drawerOpen || permanent) return;
    /*
     * `lockScroll`, not `document.body.style.overflow`.
     *
     * The document element is what scrolls here, so hiding overflow on the
     * body alone leaves the page moving under the drawer — which is exactly
     * what it did. `lockScroll` covers <html> too, compensates for a native
     * scrollbar gutter, and stops Lenis, which keeps gliding regardless of
     * any overflow rule.
     */
    const releaseScroll = lockScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      releaseScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, permanent]);

  /**
   * Switch view, and write the URL WITHOUT navigating.
   *
   * This used to call `router.replace`. In the App Router that is a real
   * navigation: it asks the server for the route again, which re-runs the
   * admin page — six database reads, every one of them for data already
   * sitting in this component's props — before the new tab can paint.
   * Moving between tabs was therefore slower than moving between pages of
   * the public site, which is the opposite of what a dashboard should feel
   * like and exactly what was reported.
   *
   * `history.replaceState` gives the same shareable, reload-safe URL with no
   * round trip at all. Nothing on the server depends on `?view=`: the page
   * takes no `searchParams`, so there was never anything to re-render for.
   */
  function go(id: ViewId) {
    setView(id);
    setDrawerOpen(false);
    const next = new URLSearchParams(window.location.search);
    if (id === "overview") next.delete("view");
    else next.set("view", id);
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }

  const header = HEADERS[view];

  return (
    <div className="min-h-screen bg-pastel px-4 pb-5 pt-20 sm:px-6 lg:pt-5">
      {/*
        The only way into the drawer on a phone, and it floats above the
        content so it is reachable from anywhere on a long table without
        scrolling back up. Hidden from `lg`, where the sidebar is permanent.
      */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open admin menu"
        aria-expanded={drawerOpen}
        aria-controls="admin-drawer"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_3px_0_0_var(--color-black02)] lg:hidden"
      >
        <List size={20} weight="bold" />
      </button>

      <div className="mx-auto flex max-w-[100rem] flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          {/*
            The scrim. It fades rather than appearing, and it is what makes
            the drawer read as sitting ABOVE the page instead of replacing it.
            Tapping it closes, like every other dismissable surface here.
          */}
          <div
            aria-hidden
            onClick={() => setDrawerOpen(false)}
            className={`fixed inset-0 z-30 bg-black02/50 transition-opacity duration-300 ease-out motion-reduce:transition-none lg:hidden ${
              drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          {/*
            Kept MOUNTED and slid in and out, rather than switched between
            `hidden` and `flex` — an element that does not exist cannot
            animate, which is why every open and close was instantaneous.

            `inert` while it is off-screen, so its buttons are not tabbable
            from a page that appears to be showing no menu at all. Driven by
            the media query rather than by a class, because `inert` is an
            attribute and cannot be scoped to a breakpoint.
          */}
          <div
            id="admin-drawer"
            inert={!shown}
            className={`fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain border-0 bg-offwhite p-5 transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-auto lg:bottom-5 lg:top-5 lg:w-56 lg:translate-x-0 lg:rounded-lg lg:border lg:border-black02/20 lg:p-4 lg:transition-none ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Square on a phone: a full-bleed panel with rounded corners
                reads as a card that failed to fill the screen. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close admin menu"
              className="mb-4 self-end rounded-pill border-2 border-black02 p-2 text-black02 lg:hidden"
            >
              <X size={18} weight="bold" />
            </button>
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="DevFest Yaoundé"
            >
              <DevFestLogo className="h-7 w-auto shrink-0" />
              <span className="font-sans text-body-m font-bold leading-tight text-black02">
                DevFest Yaoundé
              </span>
            </Link>
            <p className="mt-3 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50">
              Admin
            </p>
            <p className="mt-0.5 truncate text-body-m font-bold text-black02">
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
              className="mt-auto inline-flex items-center gap-2 px-3 py-2 pt-6 font-sans text-body-m font-bold text-black02/70 hover:text-black02"
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
