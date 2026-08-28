/* eslint-disable @next/next/no-img-element -- sponsor logos are content-driven URLs from JSON; next/image isn't wired for these yet */
import { getLocale, getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import pastEditions from "@/data/past-editions.json";
import sponsors from "@/data/sponsors.json";
import {
  heroDelayStyle,
  heroRise,
  marqueeLoop,
  marqueeTrack,
  wordPop,
  wordStyle,
} from "@/lib/motion";
import type { PastEditionPhoto, Sponsor } from "@/data/types";

const heroPhotos = (pastEditions as PastEditionPhoto[]).slice(0, 3);
const sponsorList = sponsors as Sponsor[];

/** Scrapbook tilt per photo — deliberately uneven, like pinned-up prints. */
const PHOTO_TILT = ["-rotate-6", "rotate-3", "-rotate-2"];
const PHOTO_OFFSET = ["lg:mt-0", "lg:mt-12", "lg:-mt-4"];

/**
 * Festival hero (PHASE5 §2). The previous version read as a corporate
 * product landing page; the energy here comes from the animated logo,
 * kinetic per-word type, tilted community photos and casual copy —
 * deliberately NOT from more color, since yellow stays dominant (§2.5).
 *
 * Abstract decorative circles were removed per PHASE5 §8; type scale,
 * motion, photos and the logo carry the section instead.
 *
 * Layout note: the block is `min-h-svh` with the sponsor strip as the last
 * flex child, so the strip lands inside the first viewport (§3) rather than
 * below the fold. `svh` (not `vh`) so mobile browser chrome doesn't push it
 * out of view.
 */
export async function Hero() {
  const t = await getTranslations("home.hero");
  const locale = (await getLocale()) as "fr" | "en";
  const year = new Date().getFullYear();

  // Kinetic headline: "DevFest" / "Yaoundé" / year animate as separate words
  const words = [t("headlineLead"), `${t("headlineCity")} ${year}`];

  return (
    <section className="flex min-h-svh flex-col bg-yellow-pastel pt-28 sm:pt-32">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-4 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
          <div>
            <div
              className={`${heroRise} flex items-center gap-4`}
              style={heroDelayStyle(0)}
            >
              <DevFestLogo
                animateIn
                interactive
                title="DevFest"
                className="h-11 w-auto cursor-pointer sm:h-12"
              />
              <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70">
                {t("eyebrow")}
              </p>
            </div>

            <h1 className="mt-4 font-sans text-display-hero font-bold leading-[0.95] text-black02">
              {words.map((word, i) => (
                <span
                  key={word}
                  className={`${wordPop} mr-[0.22em] last:mr-0`}
                  style={wordStyle(i, 260)}
                >
                  {word}
                </span>
              ))}
            </h1>

            <p
              className={`${heroRise} mt-5 max-w-xl text-body-l text-black02/80`}
              style={heroDelayStyle(620)}
            >
              {t("tagline")}
            </p>

            <div
              className={`${heroRise} mt-5 flex flex-wrap items-center gap-3`}
              style={heroDelayStyle(720)}
            >
              <span className="rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
                {t("dates")}
              </span>
              <span className="rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
                {t("venue")}
              </span>
            </div>

            <div
              className={`${heroRise} mt-6 flex flex-wrap items-center gap-4`}
              style={heroDelayStyle(820)}
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
          </div>

          {/* Tilted community photo scrapbook — warmth, not abstract decoration */}
          <div
            className={`${heroRise} hidden grid-cols-3 gap-4 lg:grid`}
            style={heroDelayStyle(900)}
          >
            {heroPhotos.map((photo, i) => (
              <MorphedImageFrame
                key={photo.id}
                src={photo.imageUrl}
                alt={photo.alt[locale]}
                aspectRatio="3/4"
                className={`border-2 border-black02 shadow-[0_5px_0_0_var(--color-black02)] transition-transform duration-300 ease-bouncy hover:rotate-0 hover:scale-105 ${PHOTO_TILT[i]} ${PHOTO_OFFSET[i]}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sponsor strip — inside the first viewport per PHASE5 §3 */}
      <div
        className={`${heroRise} shrink-0 border-y-2 border-black02 bg-offwhite py-4`}
        style={heroDelayStyle(1000)}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
            {t("sponsorsLabel")}
          </p>
        </div>
        <div className={`${marqueeTrack} mt-3 overflow-hidden`}>
          <div className={`${marqueeLoop} flex w-max items-center gap-12`}>
            {[...sponsorList, ...sponsorList].map((sponsor, i) => (
              <img
                key={`${sponsor.id}-${i}`}
                src={sponsor.logoUrl}
                alt={sponsor.name}
                aria-hidden={i >= sponsorList.length}
                className="h-10 w-auto shrink-0 sm:h-12"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
