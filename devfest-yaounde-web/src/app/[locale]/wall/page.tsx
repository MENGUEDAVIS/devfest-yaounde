import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DpWall } from "@/components/wall/DpWall";
import { pageMetadata } from "@/lib/seo";
import type { WallCard } from "@/data/wall-placeholders";
import { CHAPTER_EMAIL } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.wall" });
  return pageMetadata({
    locale,
    path: "/wall",
    title: t("title"),
    description: t("metaDesc"),
    /*
     * NOINDEX, and deliberately.
     *
     * The wall displays photographs of people who agreed to appear on a
     * community page. Letting a search engine index and cache those faces is
     * a further distribution nobody consented to, and it would outlive the
     * takedown path and the retention rule — a card deleted at day 200 could
     * still sit in an image index. Consent to be on the wall is not consent
     * to be in a search result.
     */
    index: false,
  });
}

/**
 * `/{locale}/wall` — the community wall.
 *
 * Live cards from `GET /api/dp/gallery` (visible + approved). An empty
 * wall is a "be the first" state, not labelled placeholders (ADR 0034).
 */
export default async function WallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.wall");

  let cards: WallCard[] = [];
  let hasMore = false;
  if (process.env.NEXT_PUBLIC_DP_GALLERY === "1") {
    const base =
      process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
    try {
      const response = await fetch(`${base}/api/dp/gallery`, {
        next: { revalidate: 60 },
      });
      if (response.ok) {
        const data = (await response.json()) as {
          cards?: WallCard[];
          hasMore?: boolean;
        };
        cards = data.cards ?? [];
        hasMore = Boolean(data.hasMore);
      }
    } catch {
      // Empty state below rather than a crash.
    }
  }

  const empty = cards.length === 0;

  return (
    <main
      id="main-content"
      data-wall
      className="relative h-[100svh] overflow-hidden"
    >
      <h1 className="sr-only">{t("title")}</h1>
      {!empty && <DpWall cards={cards} placeholder={false} hasMore={hasMore} />}
      {empty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-sans text-heading-l font-bold text-black02">
            {t("emptyTitle")}
          </p>
          <p className="max-w-md text-body-l text-black02/80">
            {t("emptyBody")}
          </p>
          <Link
            href="/dp-generator"
            className="rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02"
          >
            {t("emptyCta")}
          </Link>
        </div>
      )}
      <a
        href={`mailto:${CHAPTER_EMAIL}`}
        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 text-center font-mono text-mono-tag font-bold uppercase tracking-wide text-black02"
      >
        {t("takedownHint", { email: CHAPTER_EMAIL })}
      </a>
    </main>
  );
}
