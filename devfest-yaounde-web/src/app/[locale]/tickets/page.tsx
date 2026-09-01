import { getTranslations, setRequestLocale } from "next-intl/server";
import { TicketCheckout } from "@/components/tickets/TicketCheckout";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import tiers from "@/data/ticket-tiers.json";
import type { TicketTier } from "@/data/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.tickets" });
  return { title: t("title"), description: t("lead") };
}

/**
 * `/{locale}/tickets` — tier selection and checkout (PAGES.md §7).
 *
 * Tiers are read from `src/data/ticket-tiers.json` here and rendered by the
 * client, but note what is NOT sent when the order is placed: no price. The
 * server recomputes every total from this same file by id, so what is shown
 * and what is charged cannot drift, and a tampered request body changes
 * nothing.
 *
 * The tier data is still PLACEHOLDER — the names, prices and perks are
 * invented (`docs/setup/remaining-work.md` §1 item 8). The shape is real.
 */
export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.tickets");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>

        <div className="mt-16">
          <TicketCheckout tiers={tiers as TicketTier[]} />
        </div>
      </SectionContainer>
    </main>
  );
}
