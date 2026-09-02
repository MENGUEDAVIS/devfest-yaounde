import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.account" });
  return pageMetadata({
    locale,
    path: "/account",
    title: t("title"),
    description: t("metaDesc"),
    index: false,
  });
}

/** `/{locale}/account` — My Tickets and My Orders, shared by tickets and shop. */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.account");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} />
        </h1>
        <div className="mt-14">
          <AccountDashboard />
        </div>
      </SectionContainer>
    </main>
  );
}
