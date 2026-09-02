import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShopCheckout } from "@/components/shop/ShopCheckout";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import products from "@/data/products.json";
import type { Product } from "@/data/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.shop" });
  // Someone's bag has no business in a search index.
  return { title: t("bagTitle"), robots: { index: false, follow: false } };
}

/** `/{locale}/shop/cart` — the bag and its checkout (Part A's wizard). */
export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.shop");

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("bagTitle")} />
        </h1>
        <div className="mt-14">
          <ShopCheckout products={products as Product[]} />
        </div>
      </SectionContainer>
    </main>
  );
}
