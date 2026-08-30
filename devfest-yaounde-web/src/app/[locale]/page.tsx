import { setRequestLocale } from "next-intl/server";
import { About } from "@/components/home/About";
import { CommunityCta } from "@/components/home/CommunityCta";
import { FaqPreview } from "@/components/home/FaqPreview";
import { Hero } from "@/components/home/Hero";
import { MemoryLane } from "@/components/home/MemoryLane";
import { QuotesInterstitial } from "@/components/home/QuotesInterstitial";
import { ScheduleOverviewPreview } from "@/components/home/ScheduleOverviewPreview";
import { SpeakerShowcase } from "@/components/home/SpeakerShowcase";
import { StatsInterstitial } from "@/components/home/StatsInterstitial";

// A "Tracks" section (PAGES.md §2.6) is intentionally skipped — tracks
// aren't confirmed for this year, and DESIGN.md/PAGES.md forbid inventing
// content that isn't confirmed. Revisit once tracks are decided.

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content" className="flex-1">
      <Hero />
      <About />
      <StatsInterstitial />
      <SpeakerShowcase />
      <ScheduleOverviewPreview />
      <QuotesInterstitial />
      <MemoryLane />
      <CommunityCta />
      <FaqPreview />
    </main>
  );
}
