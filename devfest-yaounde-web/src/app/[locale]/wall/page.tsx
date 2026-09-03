import { getTranslations, setRequestLocale } from "next-intl/server";
import { DpWall } from "@/components/wall/DpWall";
import { pageMetadata } from "@/lib/seo";
import { WALL_PLACEHOLDERS, type WallCard } from "@/data/wall-placeholders";

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
 * WHAT IT SHOWS depends on whether the wall is switched on for this
 * deployment. With `NEXT_PUBLIC_DP_GALLERY` unset, `GET /api/dp/gallery`
 * answers 404 and this renders clearly-labelled placeholders instead: the
 * page can be built, reviewed and judged before anyone's face is on it.
 *
 * Both paths render through the SAME component and the same card shape, so
 * there is no second layout to keep correct — the only difference is where
 * the cards came from, and whether the page says they are stand-ins.
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
  if (process.env.NEXT_PUBLIC_DP_GALLERY === "1") {
    const base =
      process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
    try {
      const response = await fetch(`${base}/api/dp/gallery`, {
        // The wall is a live surface; a card approved a minute ago should be
        // on it. Cheap, because the payload is a page of ids and URLs.
        next: { revalidate: 60 },
      });
      if (response.ok) {
        const data = (await response.json()) as { cards?: WallCard[] };
        cards = data.cards ?? [];
      }
    } catch {
      // The wall degrades to placeholders rather than to an empty screen.
    }
  }

  const placeholder = cards.length === 0;
  const shown = placeholder ? WALL_PLACEHOLDERS : cards;

  return (
    <main
      id="main-content"
      data-wall
      /*
       * A viewport-tall box, not `flex-1`. The wall inside is absolutely
       * positioned, so it contributes no height of its own — with `flex-1`
       * this collapsed to nothing and the site footer took the whole screen.
       *
       * `data-wall` is also what the two CSS rules in globals.css key off:
       * the page does not scroll here, and the footer is not rendered, since
       * a footer under a non-scrolling wall is unreachable anyway.
       */
      className="relative h-[100svh] overflow-hidden"
    >
      <h1 className="sr-only">{t("title")}</h1>
      <DpWall cards={shown} placeholder={placeholder} />

      {placeholder && (
        /* Said out loud, not implied. Nobody should have to guess whether
           they are looking at real people. */
        <p className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto w-fit max-w-[92vw] rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 text-center font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
          {t("placeholderNotice")}
        </p>
      )}
    </main>
  );
}
