/* eslint-disable @next/next/no-img-element -- hero/sponsor imagery are content-driven URLs from JSON; next/image isn't wired for these yet */
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import pastEditions from "@/data/past-editions.json";
import sponsors from "@/data/sponsors.json";
import {
  heroBgDrift,
  heroDelayStyle,
  heroRise,
  marqueeLoop,
  marqueeTrack,
  scrollCue,
  tileIn,
  tileStyle,
  wordPop,
  wordStyle,
} from "@/lib/motion";
import type { PastEditionPhoto, Sponsor } from "@/data/types";

const photos = pastEditions as PastEditionPhoto[];
const sponsorList = sponsors as Sponsor[];

/** Backdrop collage tilts — uneven so it reads as pinned prints. */
const TILE_ROTATION = [-7, 4, -3, 6, -5, 3];

/**
 * Full-page vertical hero (PHASE6 §1).
 *
 * Structure, bottom-to-top in z-order:
 *   1. Photo layer   — community collage, slowly drifting (ambient life)
 *   2. Flat scrim    — a solid Black02 haze plus a solid Pastel Yellow wash.
 *                      FLAT fills only, never a gradient (DESIGN.md §2.6);
 *                      this is what guarantees text legibility over busy
 *                      real photos.
 *   3. Content       — logo, kinetic headline, tagline, CTAs, stacked
 *                      VERTICALLY as the primary axis. No side-by-side
 *                      text|image split.
 *   4. Sponsor strip — anchored to the bottom of the same block so it stays
 *                      inside the first viewport (Phase 5 §3 still holds).
 *
 * `min-h-svh` (small-viewport height) rather than `vh`, so mobile browser
 * chrome can't push the sponsor strip out of the first screen.
 */
export async function Hero() {
  const t = await getTranslations("home.hero");
  const year = new Date().getFullYear();

  const words = [t("headlineLead"), `${t("headlineCity")} ${year}`];
  // Repeat the placeholder set so the collage fills wide viewports
  const tiles = [...photos, ...photos, ...photos, ...photos, ...photos].slice(
    0,
    18,
  );

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-yellow-pastel">
      {/* ---- Layer 1: drifting community photo collage ---- */}
      <div aria-hidden className={`${heroBgDrift} absolute inset-0 z-0`}>
        <div className="grid h-full w-full grid-cols-3 grid-rows-6 gap-2.5 p-2.5 sm:grid-cols-4 sm:grid-rows-5 sm:gap-3 sm:p-3 lg:grid-cols-6 lg:grid-rows-3">
          {tiles.map((photo, i) => (
            <div
              key={`${photo.id}-${i}`}
              className={`${tileIn} overflow-hidden rounded-lg border-2 border-black02/70`}
              style={tileStyle(i, TILE_ROTATION[i % TILE_ROTATION.length])}
            >
              <img
                src={photo.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/*
        ---- Layer 2: flat legibility scrim ----
        Two stacked FLAT fills (no gradient): a Black02 haze to knock back
        photo contrast, then a Pastel Yellow wash to pull it back onto the
        brand base. Verified against a deliberately busy photograph.
      */}
      <div aria-hidden className="absolute inset-0 z-10 bg-black02/30" />
      <div aria-hidden className="absolute inset-0 z-10 bg-yellow-pastel/80" />

      {/* ---- Layer 3: vertical content stack ---- */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 pb-4 pt-36 text-center sm:px-8 sm:pt-32">
        <div
          className={`${heroRise} flex flex-col items-center gap-3 sm:gap-4`}
          style={heroDelayStyle(0)}
        >
          <DevFestLogo
            animateIn
            interactive
            title="DevFest"
            className="h-11 w-auto cursor-pointer sm:h-16 lg:h-20"
          />
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70">
            {t("eyebrow")}
          </p>
        </div>

        <h1 className="mt-4 font-sans text-display-hero font-bold leading-[0.92] text-black02">
          {words.map((word, i) => (
            // Outer span owns the line break; inner span owns the animation
            // (.anim-word-pop forces display:inline-block, which would
            // otherwise override a `block` utility on the same element).
            <span key={word} className="block">
              <span className={wordPop} style={wordStyle(i, 300)}>
                {word}
              </span>
            </span>
          ))}
        </h1>

        <p
          className={`${heroRise} mt-4 max-w-2xl text-body-l sm:mt-5 text-black02/85`}
          style={heroDelayStyle(660)}
        >
          {t("tagline")}
        </p>

        <div
          className={`${heroRise} mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:mt-5 sm:gap-3`}
          style={heroDelayStyle(760)}
        >
          <span className="rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
            {t("dates")}
          </span>
          <span className="rounded-pill border-2 border-black02 bg-offwhite px-4 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
            {t("venue")}
          </span>
        </div>

        <div
          className={`${heroRise} mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6 sm:gap-4`}
          style={heroDelayStyle(860)}
        >
          <Button tone="yellow" href="/tickets" size="lg">
            {t("ctaPrimary")}
          </Button>
          <Button tone="black02" variant="secondary" href="/shop" size="lg">
            {t("ctaSecondary")}
          </Button>
        </div>

        <a
          href="#"
          className={`${heroRise} mt-3 font-sans text-body-m font-bold text-black02 underline sm:mt-4 decoration-2 underline-offset-4 transition-colors duration-200 hover:text-black02/60`}
          style={heroDelayStyle(920)}
        >
          {t("ctaTertiary")}
        </a>

        <div
          className={`${heroRise} mt-4 text-black02/50 sm:mt-6`}
          style={heroDelayStyle(1100)}
        >
          <span className="sr-only">{t("scrollCue")}</span>
          <CaretDown size={24} weight="bold" className={scrollCue} />
        </div>
      </div>

      {/* ---- Layer 4: sponsor strip, inside the first viewport ---- */}
      <div
        className={`${heroRise} relative z-20 shrink-0 border-t-2 border-black02 bg-offwhite py-4`}
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
