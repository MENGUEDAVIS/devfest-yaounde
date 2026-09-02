import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { SectionContainer } from "@/components/ui/SectionContainer";
import products from "@/data/products.json";
import type { Product } from "@/data/types";

const catalog = products as Product[];

/** Pre-renders every product in both locales — the catalog is small and static. */
export function generateStaticParams() {
  return catalog.map((p) => ({ product: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await params;
  const found = catalog.find((p) => p.id === product);
  if (!found) return {};
  return {
    title: found.name[locale as "fr" | "en"],
    description: found.description[locale as "fr" | "en"],
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await params;
  setRequestLocale(locale);
  const found = catalog.find((p) => p.id === product);
  // A mistyped or retired product id is a 404, not an empty page.
  if (!found) notFound();

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <ProductDetail product={found} />
      </SectionContainer>
    </main>
  );
}
