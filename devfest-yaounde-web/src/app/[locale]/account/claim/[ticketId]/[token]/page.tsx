import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClaimTicket } from "@/components/account/ClaimTicket";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.claimTicket" });
  return pageMetadata({
    locale,
    path: "/account/claim",
    title: t("title"),
    description: t("metaDesc"),
    index: false,
  });
}

/**
 * `/{locale}/account/claim/{ticketId}/{token}` — where a "claim your
 * ticket" email link lands (PHASE22 §C). The route itself does no
 * validation: `ticketId`/`token` are opaque strings handed to
 * `POST /api/tickets/claim`, which is the one place that actually checks
 * them — a malformed or tampered link fails there with a real error state,
 * not a 404 here that gives nothing away about why.
 */
export default async function ClaimTicketPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string; token: string }>;
}) {
  const { locale, ticketId, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.claimTicket");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <div className="mt-14">
          <ClaimTicket ticketId={ticketId} token={token} />
        </div>
      </SectionContainer>
    </main>
  );
}
