import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TicketCheckout } from "@/components/tickets/TicketCheckout";
import { CapacityCounter } from "@/components/tickets/CapacityCounter";
import { AccountLink } from "@/components/account/AccountLink";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { loadSettings } from "@/lib/content/settings";
import { getTiers } from "@/lib/content/store";
import { getTicketCapacity } from "@/lib/payments/capacity";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.tickets" });
  return pageMetadata({
    locale,
    path: "/tickets",
    title: t("title"),
    description: t("metaDesc"),
  });
}

/**
 * `/{locale}/tickets` — tier selection and checkout (PAGES.md §7).
 *
 * Tiers are read via `getTiers()` — the editorial content store, admin-
 * editable (Phase 20), falling back to `src/data/ticket-tiers.json` on a
 * fresh clone with no database. What is NOT sent when the order is placed:
 * no price. The server recomputes every total from this same source by id,
 * so what is shown and what is charged cannot drift, and a tampered request
 * body changes nothing.
 */
export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.tickets");
  const [tiers, settings, capacity] = await Promise.all([
    getTiers(),
    loadSettings(),
    getTicketCapacity(),
  ]);

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>
        <AccountLink label={t("myTicketsLink")} />

        {capacity.total != null && (
          <div className="mt-6">
            <CapacityCounter initial={capacity} />
          </div>
        )}

        <div className="mt-16">
          <TicketCheckout tiers={tiers} bevyUrl={settings.bevyUrl} />
        </div>
      </SectionContainer>
    </main>
  );
}
