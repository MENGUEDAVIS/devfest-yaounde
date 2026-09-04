/* eslint-disable @next/next/no-img-element -- hero/sponsor imagery are content-driven URLs from JSON; next/image isn't wired for these yet */
import {
  CaretDown,
  MapPin,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Button } from "@/components/ui/Button";
import { getPastEditions, getSponsors } from "@/lib/content/store";
import {
  heroBgDrift,
  heroDelayStyle,
  heroRise,
  lineStyle,
  marqueeLoop,
  marqueeTrack,
  maskLine,
  scrollCue,
  stampIn,
  stampStyle,
  tileIn,
  tileStyle,
} from "@/lib/motion";




/** Backdrop collage tilts — uneven so it reads as pinned prints. */
const TILE_ROTATION = [-7, 4, -3, 6, -5, 3];

/**
 * Full-page vertical hero — PHASE6 §1 structure, PHASE7 §2 refinement.
 *
 * The background layers are unchanged (approved in Phase 6): drifting photo
 * collage, then two FLAT scrims (Black02 haze + Pastel Yellow wash) that
 * guarantee legibility over busy real photos. Never a gradient (§2.6).
 *
 * What changed in PHASE7 §2:
 *  - The overlaid text was "plain". It now carries the §7b boldness: the
 *    headline is a two-line masked reveal where the second line sits inside
 *    a solid Yellow 600 stamp block, giving dramatic weight/colour contrast
 *    without adding a new hue or a gradient. Solid fills keep the measured
 *    contrast headroom intact.
 *  - Entrance is a staged, masked line-rise (lines climb out from behind a
 *    clip), not a gentle fade.
 *  - "Too long" fixed by LAYERING rather than stacking: the date/venue moved
 *    into a compact inline ticket stub (§3), the eyebrow now sits beside the
 *    logo instead of under it, the scroll cue is absolutely positioned so it
 *    costs no vertical row, and the RSVP tertiary link is gone (§4).
 */
export async function Hero() {
  const t = await getTranslations("home.hero");
  const year = new Date().getFullYear();
  const photos = await getPastEditions();
  const sponsorList = await getSponsors();

  const tiles = [...photos, ...photos, ...photos, ...photos, ...photos].slice(
    0,
    18,
  );

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-pastel">
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

      {/* ---- Layer 2: flat legibility scrim (unchanged, verified 8.7:1) ---- */}
      <div aria-hidden className="absolute inset-0 z-10 bg-black02/30" />
      <div aria-hidden className="absolute inset-0 z-10 bg-pastel/80" />

      {/* ---- Layer 3: content ---- */}
      {/*
        PHASE11 §6: more breathing room around the hero text block, weighted
        VERTICAL over horizontal (py 3.5rem vs px 1.75rem at base) so the
        headline keeps its full measure while gaining air above and below.
        The large `pt` is unchanged in intent — it still clears the fixed
        chrome — it just no longer doubles as the block's only padding.
      */}
      {/*
        Block padding, weighted vertical over horizontal (PHASE11 §6) but now
        RESPONSIVE (PHASE13 §3): 144px of top padding is a lot of a 640px
        phone screen. It scales from snug on mobile up to the original
        desktop values.
      */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-28 text-center sm:px-8 sm:pb-14 sm:pt-32 lg:px-10 lg:pb-16 lg:pt-36">
        {/* Logo + eyebrow on ONE row — was two stacked rows */}
        <div
          className={`${heroRise} flex items-center gap-3 sm:gap-4`}
          style={heroDelayStyle(0)}
        >
          <DevFestLogo
            animateIn
            interactive
            title="DevFest"
            className="h-9 w-auto cursor-pointer sm:h-11"
          />
          <span className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70">
            {t("eyebrow")}
          </span>
        </div>

        {/*
          Headline — the §7b bold moment. Line 1 plain, line 2 stamped into a
          solid yellow block for dramatic contrast. Both rise out of masks.
        */}
        {/*
          Easter egg (PHASE11 §1): hovering "DevFest" scrambles it and
          decodes it back. Only line 1 carries it — the stamped city block on
          line 2 is the hero's loudest element already, and animating both
          would read as a glitch rather than a secret.
        */}
        {/*
          `leading-[0.82]` (was 0.88) plus the stamp's removed top margin is
          what closes the gap between "DevFest" and the "Yaoundé ####" block
          so they nearly touch (PHASE11 §6). The mask-line padding in
          motion.css still keeps the é accent and cap-heights from clipping.
        */}
        <h1 className="mt-5 font-sans text-display-hero font-bold leading-[0.82] text-black02 sm:mt-6">
          <span className={maskLine}>
            <span style={lineStyle(0, 260)}>
              <ScrambleText text={t("headlineLead")} />
            </span>
          </span>
          <span className={maskLine}>
            <span style={lineStyle(1, 260)}>
              <span
                /*
                  PHASE13 §3. The previous values (`-mt-6 px-10! p-8`) were a
                  desktop-only edit that mobile inherited wholesale:
                    - `px-10!` used `!important`, so it BEAT the `sm:` variant
                      and forced 40px of horizontal padding at every width.
                    - `p-8` added 32px vertically, and with `-mt-6` pulling
                      the block up, the stamp's top was clipped by 15px by the
                      mask-line's `overflow: hidden` (measured on 360x640,
                      390x844 and 640x360).
                  Now the padding and the tightening negative margin both
                  scale with the breakpoint: snug on a phone, and the full
                  desktop tightening from `sm` up.
                */
                className={`${stampIn} -mt-1.5 inline-block rounded-lg border-4 border-black02 bg-primary px-4 py-2 shadow-[0_8px_0_0_var(--color-black02)] sm:-mt-3 sm:px-7 sm:py-4 lg:-mt-5 lg:px-10 lg:py-6`}
                style={stampStyle(760, -1.5)}
              >
                {t("headlineCity")} {year}
              </span>
            </span>
          </span>
        </h1>

        <p
          className={`${heroRise} mt-7 max-w-xl text-body-l text-black02/85 sm:mt-8`}
          style={heroDelayStyle(1000)}
        >
          {t("tagline")}
        </p>

        {/*
          §3 — date/venue as a compact single "ticket stub" strip: one row,
          mono type, a perforated divider between the two halves. Replaces
          the two space-hungry stacked pills.
        */}
        <div
          className={`${heroRise} mt-6 flex items-stretch overflow-hidden rounded-pill border-2 border-black02 bg-offwhite font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 shadow-[0_4px_0_0_var(--color-black02)]`}
          style={heroDelayStyle(1080)}
        >
          <span className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
            <CalendarBlank size={16} weight="bold" aria-hidden />
            <span className="sr-only">{t("dateLabel")}: </span>
            {t("dates")}
          </span>
          {/* Perforation — dashed rule, the stub's tear line */}
          <span
            aria-hidden
            className="w-0 self-stretch border-l-2 border-dashed border-black02"
          />
          <span className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
            <MapPin size={16} weight="bold" aria-hidden />
            <span className="sr-only">{t("venueLabel")}: </span>
            {t("venue")}
          </span>
        </div>

        <div
          className={`${heroRise} mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4`}
          style={heroDelayStyle(1160)}
        >
          <Button tone="primary" href="/tickets" size="lg">
            {t("ctaPrimary")}
          </Button>
          <Button tone="black02" variant="secondary" href="/shop" size="lg">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>

      {/* Scroll cue — absolutely positioned so it costs no vertical row */}
      <div
        className={`${heroRise} pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2 text-black02/45 sm:bottom-32`}
        style={heroDelayStyle(1500)}
      >
        <span className="sr-only">{t("scrollCue")}</span>
        <CaretDown size={24} weight="bold" className={scrollCue} />
      </div>

      {/* ---- Layer 4: sponsor strip, anchored inside the first viewport ---- */}
      <div
        className={`${heroRise} relative z-20 shrink-0 border-t-2 border-black02 bg-offwhite py-3.5`}
        style={heroDelayStyle(1300)}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
            {t("sponsorsLabel")}
          </p>
        </div>
        <div className={`${marqueeTrack} mt-2.5 overflow-hidden`}>
          {/* No flex `gap` here — spacing is a per-item margin so the
              -50% loop lands exactly on the seam. See .anim-marquee. */}
          <div className={`${marqueeLoop} flex w-max items-center`}>
            {[...sponsorList, ...sponsorList].map((sponsor, i) => (
              <img
                key={`${sponsor.id}-${i}`}
                src={sponsor.logoUrl}
                alt={sponsor.name}
                aria-hidden={i >= sponsorList.length}
                className="h-9 w-auto shrink-0 sm:h-11"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
