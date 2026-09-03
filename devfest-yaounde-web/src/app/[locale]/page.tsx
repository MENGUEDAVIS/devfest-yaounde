import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { About } from "@/components/home/About";
import { CommunityCta } from "@/components/home/CommunityCta";
import { FaqPreview } from "@/components/home/FaqPreview";
import { Hero } from "@/components/home/Hero";
import { MemoryLane } from "@/components/home/MemoryLane";
import { QuotesInterstitial } from "@/components/home/QuotesInterstitial";
import { ScheduleOverviewPreview } from "@/components/home/ScheduleOverviewPreview";
import { SpeakerShowcase } from "@/components/home/SpeakerShowcase";
import { StatsInterstitial } from "@/components/home/StatsInterstitial";
import { getFaqs, getQuotes, getSpeakers } from "@/lib/content/store";
import { eventJsonLd } from "@/lib/event";
import { JsonLd, pageMetadata } from "@/lib/seo";

// A "Tracks" section (PAGES.md §2.6) is intentionally skipped — tracks
// aren't confirmed for this year, and DESIGN.md/PAGES.md forbid inventing
// content that isn't confirmed. Revisit once tracks are decided.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return pageMetadata({
    locale,
    title: "DevFest Yaoundé",
    description: t("metaDesc"),
    ogTitle: "DevFest Yaoundé",
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const [speakers, quotes, faqs] = await Promise.all([
    getSpeakers(),
    getQuotes(),
    getFaqs(),
  ]);

  return (
    <main id="main-content" className="flex-1">
      {/*
        `Event` structured data, which appears only once a real date exists.
        `startDate` is REQUIRED by schema.org, so emitting the block without
        one is invalid data that Search Console reports and no rich result
        comes from — and inventing a date would publish a wrong one to every
        crawler that read it. It switches itself on with `EVENT_BASE_DATE` in
        calendar.ts, the same flag that reveals the add-to-calendar buttons.
      */}
      <JsonLd
        data={eventJsonLd(locale === "en" ? "en" : "fr", t("metaDesc"))}
      />
      <Hero />
      <About />
      <StatsInterstitial />
      <SpeakerShowcase speakers={speakers} />
      <ScheduleOverviewPreview />
      <QuotesInterstitial quotes={quotes} />
      <MemoryLane />
      <CommunityCta />
      <FaqPreview faqs={faqs} />
    </main>
  );
}
