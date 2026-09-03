"use client";

import { Package, SignOut, Ticket as TicketIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BadgeCode } from "@/components/tickets/BadgeCode";
import { signInWithGoogle, signOut, useSession } from "@/lib/use-session";

interface Ticket {
  id: string;
  tier_id: string;
  attendee_name: string;
  attendee_email: string;
  apparel_size: string | null;
  badge_code: string;
  checked_in_at: string | null;
  created_at: string;
}

interface OrderItem {
  product_id: string;
  variant: Record<string, string> | null;
  quantity: number;
  unit_amount: number;
  name_snapshot: string;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  fulfilment: string | null;
  created_at: string;
  order_items: OrderItem[];
}

type Tab = "tickets" | "orders";

export function AccountDashboard() {
  const t = useTranslations("pages.account");
  const locale = useLocale();
  const router = useRouter();
  const { profile, loading } = useSession();

  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      // Both endpoints are scoped to the signed-in person by the database
      // itself — there is no id to pass, and no way to ask for someone else's.
      const [tRes, oRes] = await Promise.allSettled([
        fetch("/api/account/tickets", { cache: "no-store" }),
        fetch("/api/account/orders", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (tRes.status === "fulfilled" && tRes.value.ok) {
        setTickets((await tRes.value.json()).tickets ?? []);
      } else setTickets([]);
      if (oRes.status === "fulfilled" && oRes.value.ok) {
        setOrders((await oRes.value.json()).orders ?? []);
      } else setOrders([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const money = (value: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(value);

  if (loading) {
    return <p className="text-body-l text-black02/70">{t("loading")}</p>;
  }

  if (!profile) {
    return (
      <div className="max-w-md rounded-lg border-2 border-black02 bg-offwhite p-7">
        <h2 className="font-sans text-heading-l font-bold text-black02">
          {t("signedOutTitle")}
        </h2>
        <p className="mt-3 text-body-m text-black02/80">{t("signedOutBody")}</p>
        <button
          type="button"
          onClick={() => signInWithGoogle(locale, `/${locale}/account`)}
          className="mt-6 inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
        >
          {t("continueWithGoogle")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
            {t("signedInAs")}
          </p>
          <p className="mt-1 font-sans text-heading-m font-bold text-black02">
            {profile.displayName ?? profile.email}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut(locale);
            // refresh() as well as push(): signing out changes what the
            // server renders, and a push alone would leave stale markup.
            router.push(`/${locale}`);
            router.refresh();
          }}
          className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-5 py-2.5 font-sans text-body-m font-bold text-black02 transition-colors hover:bg-pastel"
        >
          <SignOut size={16} weight="bold" />
          {t("signOut")}
        </button>
      </div>

      <div
        role="tablist"
        aria-label={t("title")}
        className="mt-10 flex overflow-hidden rounded-pill border-2 border-black02"
      >
        {(
          [
            ["tickets", TicketIcon, t("myTickets")],
            ["orders", Package, t("myOrders")],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 font-mono text-mono-tag font-bold uppercase tracking-wide transition-colors duration-200 ${
              tab === key
                ? "bg-black02 text-offwhite"
                : "bg-transparent text-black02 hover:bg-pastel"
            }`}
          >
            <Icon size={16} weight="bold" />
            {label}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        <div className="mt-8">
          {tickets === null ? (
            <p className="text-body-m text-black02/70">{t("loading")}</p>
          ) : tickets.length === 0 ? (
            <EmptyState
              title={t("noTicketsTitle")}
              body={t("noTicketsBody")}
              href="/tickets"
              cta={t("browseTickets")}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="rounded-lg border-2 border-black02 bg-offwhite p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge tone="primary" variant="outline">
                      {ticket.tier_id.toUpperCase()}
                    </Badge>
                    {ticket.checked_in_at ? (
                      <Badge tone="success">{t("checkedIn")}</Badge>
                    ) : (
                      <Badge tone="blue">{t("valid")}</Badge>
                    )}
                  </div>
                  <p className="mt-4 font-sans text-heading-m font-bold text-black02">
                    {ticket.attendee_name}
                  </p>
                  {ticket.apparel_size && (
                    <p className="mt-1 text-body-m text-black02/70">
                      {t("size", { size: ticket.apparel_size })}
                    </p>
                  )}
                  <div className="mt-5">
                    <BadgeCode
                      code={ticket.badge_code}
                      label={t("badgeLabel")}
                      size={132}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-8">
          {orders === null ? (
            <p className="text-body-m text-black02/70">{t("loading")}</p>
          ) : orders.length === 0 ? (
            <EmptyState
              title={t("noOrdersTitle")}
              body={t("noOrdersBody")}
              href="/shop"
              cta={t("browseShop")}
            />
          ) : (
            <ul className="flex flex-col gap-5">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-lg border-2 border-black02 bg-offwhite p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge tone="primary" variant="outline">
                      {order.status}
                    </Badge>
                    <span className="font-mono text-body-m font-bold text-black02">
                      {money(order.total_amount)} {order.currency}
                    </span>
                  </div>
                  <ul className="mt-4 flex flex-col gap-2">
                    {order.order_items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-4"
                      >
                        {/* name_snapshot, not a catalog lookup: a past order
                            keeps reading correctly after the catalog changes. */}
                        <span className="text-body-m text-black02">
                          {item.name_snapshot} × {item.quantity}
                        </span>
                        <span className="font-mono text-body-m text-black02/70">
                          {money(item.unit_amount * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-14 text-center">
      <p className="font-sans text-heading-m font-bold text-black02">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-body-m text-black02/70">
        {body}
      </p>
      <div className="mt-6 flex justify-center">
        <Button href={href} size="md">
          {cta}
        </Button>
      </div>
    </div>
  );
}
