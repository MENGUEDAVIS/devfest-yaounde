import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentReturn } from "@/components/payments/PaymentReturn";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.paymentReturn" });
  return pageMetadata({
    locale,
    path: "/payments/return",
    title: t("title"),
    description: t("metaDesc"),
    index: false,
  });
}

/**
 * `/{locale}/payments/return` — where PawaPay sends people after paying.
 *
 * This route is the one the backend already pointed at and nothing answered:
 * until now a buyer with a completed payment landed on a 404. It is built
 * first for that reason.
 *
 * The page itself is a thin server shell. It reads the deposit id from the
 * query and — the only thing it can do that the browser cannot — reports
 * whether email is actually configured, so the confirmation never promises a
 * receipt the server has no provider to send (GAPS.md G3).
 */
export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ depositId?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { depositId } = await searchParams;

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="4xl">
        <PaymentReturn
          depositId={depositId ?? null}
          emailConfigured={Boolean(process.env.RESEND_API_KEY)}
        />
      </SectionContainer>
    </main>
  );
}
