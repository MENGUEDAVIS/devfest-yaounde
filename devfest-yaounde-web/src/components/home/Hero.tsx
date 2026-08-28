/* eslint-disable @next/next/no-img-element -- sponsor logos are content-driven URLs from JSON; next/image isn't wired for these yet */
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import pastEditions from "@/data/past-editions.json";
import sponsors from "@/data/sponsors.json";
import {
  heroDelayStyle,
  heroRise,
  marqueeLoop,
  marqueeTrack,
  shapeDrift,
} from "@/lib/motion";
import type { PastEditionPhoto, Sponsor } from "@/data/types";

const heroPhotos = (pastEditions as PastEditionPhoto[]).slice(0, 4);
const sponsorList = sponsors as Sponsor[];

/**
 * DESIGN.md §7b: this is the page's one genuinely exaggerated moment.
 * Headline runs to 120px on large screens (display-hero), one oversized
 * flat shape sits behind it, and the whole thing arrives in a staggered
 * load sequence so the motion layer is felt immediately (§7c).
 */
export async function Hero() {
  const t = await getTranslations("home.hero");
  const locale = (await getLocale()) as "fr" | "en";
  const year = new Date().getFullYear();

  return (
    <div className="relative overflow-hidden bg-yellow-pastel">
      {/* One big flat shape — §7b "oversized and few", §2.6 flat fill only */}
      {/*
        Scales down on small screens — at 640px fixed it swallowed a 390px
        viewport and fought the headline for contrast. Big and bold, but it
        stays supporting rather than becoming the whole screen.
      */}
      <div
        aria-hidden
        className={`${shapeDrift} pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-pill bg-yellow-halftone sm:-right-32 sm:-top-32 sm:h-120 sm:w-120 lg:-right-40 lg:-top-40 lg:h-160 lg:w-160`}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-36 sm:px-8 sm:pb-28 sm:pt-44 lg:pb-32 lg:pt-52">
        <p
          className={`${heroRise} font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70`}
          style={heroDelayStyle(0)}
        >
          {t("eyebrow")}
        </p>

        <h1
          className={`${heroRise} mt-6 max-w-5xl font-sans text-display-hero font-bold text-black02`}
          style={heroDelayStyle(120)}
        >
          {t("headline", { year })}
        </h1>

        <p
          className={`${heroRise} mt-8 max-w-xl text-body-l text-black02/80`}
          style={heroDelayStyle(240)}
        >
          {t("dates")} · {t("venue")}
        </p>

        <div
          className={`${heroRise} mt-12 flex flex-wrap items-center gap-4`}
          style={heroDelayStyle(360)}
        >
          <Button tone="yellow" href="/tickets" size="lg">
            {t("ctaPrimary")}
          </Button>
          <Button tone="black02" variant="secondary" href="/shop" size="lg">
            {t("ctaSecondary")}
          </Button>
          <a
            href="#"
            className="font-sans text-body-m font-bold text-black02 underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-black02/60"
          >
            {t("ctaTertiary")}
          </a>
        </div>

        <div
          className={`${heroRise} mt-20 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6`}
          style={heroDelayStyle(480)}
        >
          {heroPhotos.map((photo) => (
            <MorphedImageFrame
              key={photo.id}
              src={photo.imageUrl}
              alt={photo.alt[locale]}
              aspectRatio="1/1"
              className="border-2 border-black02"
            />
          ))}
        </div>
      </div>

      {/* Sponsor marquee — linear easing per DESIGN.md §6.1, pauses on hover */}
      <div className="relative border-y-2 border-black02 bg-offwhite py-10">
        <p className="mx-auto max-w-6xl px-5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60 sm:px-8">
          {t("sponsorsLabel")}
        </p>
        <div className={`${marqueeTrack} mt-6 overflow-hidden`}>
          <div className={`${marqueeLoop} flex w-max items-center gap-14`}>
            {[...sponsorList, ...sponsorList].map((sponsor, i) => (
              <img
                key={`${sponsor.id}-${i}`}
                src={sponsor.logoUrl}
                alt={sponsor.name}
                aria-hidden={i >= sponsorList.length}
                className="h-16 w-auto shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
