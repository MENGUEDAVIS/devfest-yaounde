import {
  CaretDown,
  MapPin,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { ContentImage } from "@/components/ui/ContentImage";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Button } from "@/components/ui/Button";
import { SponsorStrip } from "@/components/home/SponsorStrip";
import { getPastEditions, getSponsors } from "@/lib/content/store";
import { loadSettings } from "@/lib/content/settings";
import { formatEventDates } from "@/lib/event";
import {
  heroBgDrift,
  heroDelayStyle,
  heroRise,
  lineStyle,
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
 * How many photos the backdrop uses.
 *
 * SIX, down from eighteen. The old grid repeated four placeholder images
 * five times over to fill 18 cells, which meant eighteen `<img>` elements,
 * eighteen staggered entrance animations and the same four pictures showing
 * three times each behind a scrim that hides most of them anyway.
 *
 * At this size the collage is texture, not content: nobody studies it, and
 * more of it is not more atmosphere. Six is enough for the tilt pattern to
 * read as pinned prints without repeating a photo on the same screen, and it
 * is a third of the work.
 *
 * The first three are enough on a phone — see the grid below.
 */
const TILE_COUNT = 6;

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
export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations("home.hero");
  /*
    From EVENT_DATES, not from a copy string. The translation files held
    "21–22 November 2026" — hand-typed from the Bevy listing's "Nov 21–28"
    and wrong in exactly the way ADR 0038 fixed everywhere else. A date is a
    fact about the event, not a phrase to translate, so it is derived and the
    key is gone.
  */
  const dates = formatEventDates(locale === "en" ? "en" : "fr");
  const year = new Date().getFullYear();
  const [photos, sponsorList, settings] = await Promise.all([
    getPastEditions(),
    getSponsors(),
    loadSettings(),
  ]);

  /*
    Take what there is, and repeat only if we must.

    The store holds four placeholder images today and will hold real
    photographs later. Slicing without repeating would leave holes in the
    grid; repeating unconditionally would show the same picture twice even
    when there are plenty. So: use each photo once, and only wrap around if
    there are fewer than the grid needs.
  */
  const tiles =
    photos.length === 0
      ? []
      : Array.from({ length: TILE_COUNT }, (_, i) => photos[i % photos.length]);

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-pastel">
      {/* ---- Layer 1: drifting community photo collage ----
          Six cells at every width, so nothing is downloaded and then hidden
          by a breakpoint. The shape changes, the count does not. */}
      <div aria-hidden className={`${heroBgDrift} absolute inset-0 z-0`}>
        <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-2.5 p-2.5 sm:grid-cols-3 sm:grid-rows-2 sm:gap-3 sm:p-3">
          {tiles.map((photo, i) => (
            <div
              key={`${photo.id}-${i}`}
              className={`${tileIn} relative overflow-hidden rounded-lg border-2 border-black02/70`}
              style={tileStyle(i, TILE_ROTATION[i % TILE_ROTATION.length])}
            >
              {/*
                `sizes` is honest about the layout above: half the viewport on
                a phone, a third from `sm` up. Without it `fill` assumes 100vw
                and every tile downloads a full-width source for a cell a
                third that size.

                Decorative — the alt is empty and the whole layer is
                aria-hidden — so these are texture, not content, and the two
                statements agree.
              */}
              <ContentImage
                src={photo.imageUrl}
                alt=""
                sizes="(min-width: 640px) 33vw, 50vw"
                /* The backdrop is above the fold and behind the headline. It
                   should not be lazy — but only the first row matters for
                   what a visitor sees first. */
                priority={i < 2}
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
      {/*
        `min-w-0` matters more than it looks: without it a flex child refuses
        to shrink below its content's intrinsic width, which is how a long
        unbreakable headline pushes a hero into horizontal scroll.
      */}
      <div className="relative z-20 flex min-w-0 flex-1 flex-col items-center justify-center px-5 pb-12 pt-28 text-center sm:px-8 sm:pb-14 sm:pt-32 lg:px-10 lg:pb-16 lg:pt-36">
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
        {/*
          MOBILE STACKING FIX. This was one nowrap row containing a full date
          and a city, and at 360px the two halves ran past the stub's rounded
          ends — the perforation and the venue text sat outside the border.

          It is a flex COLUMN below `sm` now, with the perforation turning
          from a vertical rule into a horizontal one. Same object, folded.
          `rounded-lg` on a phone rather than `rounded-pill`, because a pill
          around two stacked lines is a lozenge.
        */}
        <div
          className={`${heroRise} mt-6 flex max-w-full flex-col items-stretch overflow-hidden rounded-lg border-2 border-black02 bg-offwhite font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 shadow-[0_4px_0_0_var(--color-black02)] sm:flex-row sm:rounded-pill`}
          style={heroDelayStyle(1080)}
        >
          <span className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5">
            <CalendarBlank
              size={16}
              weight="bold"
              aria-hidden
              className="shrink-0"
            />
            <span className="sr-only">{t("dateLabel")}: </span>
            {dates}
          </span>
          {/* Perforation — the stub's tear line. Turns with the fold. */}
          <span
            aria-hidden
            className="h-0 self-stretch border-t-2 border-dashed border-black02 sm:h-auto sm:w-0 sm:border-l-2 sm:border-t-0"
          />
          <span className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5">
            <MapPin size={16} weight="bold" aria-hidden className="shrink-0" />
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

      {/* Scroll cue — absolutely positioned so it costs no vertical row.
          HIDDEN ON A PHONE: at 360x640 the content column already fills the
          viewport, so a cue pinned above the sponsor strip sits on top of the
          buttons rather than below them. Nobody needs telling that a phone
          scrolls. */}
      <div
        className={`${heroRise} pointer-events-none absolute bottom-28 left-1/2 z-20 hidden -translate-x-1/2 text-black02/45 sm:block sm:bottom-32`}
        style={heroDelayStyle(1500)}
      >
        <span className="sr-only">{t("scrollCue")}</span>
        <CaretDown size={24} weight="bold" className={scrollCue} />
      </div>

      {/* ---- Layer 4: sponsor strip, anchored inside the first viewport ----
          Its own component now, and no longer hidden when empty: the open
          seats ARE the message (ADR 0040). Extracted so the hero is one
          concern again — the strip needs the store and the settings, and the
          hero should not be the thing that fetches them. */}
      <SponsorStrip
        sponsors={sponsorList}
        call={settings.sponsorCall}
        className={heroRise}
        style={heroDelayStyle(1300)}
      />
    </section>
  );
}
