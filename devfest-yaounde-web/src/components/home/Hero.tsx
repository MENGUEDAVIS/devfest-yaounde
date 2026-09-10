import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { HeroField } from "@/components/home/HeroField";
import { HeroStickers, type HeroSticker } from "@/components/home/HeroStickers";
import { HeroWordmark } from "@/components/home/HeroWordmark";
import { EVENT, eventDateParts } from "@/lib/event";
import type { PastEditionPhoto } from "@/data/types";

/**
 * The landing hero (ADR 0046).
 *
 * ## The composition
 *
 * A photograph under everything, a dot-field texture over it, and the content
 * arranged in two columns above both. The left column is the mass: a small
 * label, then a two-line wordmark hugging the bottom-left that grows in like
 * a bar chart. The right column is the argument: tagline, the two CTAs, and
 * the date and venue set as figures — the slot the reference this comes from
 * gives its statistics. A cluster of the DP generator's own stickers is
 * spread across the middle, some in front of the wordmark and some behind it.
 *
 * ## What is reactive and what is fixed
 *
 * Deliberately split. The **wordmark does not move** — no pointer lean, no
 * scroll recede; it reveals once and then holds still. The **date and venue
 * do not move** either; they are figures, and figures that drift read as
 * unreliable. Everything that IS reactive is scenery: the stickers lean and
 * lift, the dot field's highlight follows the pointer, the photograph pulls
 * back as the section leaves. The fixed things are the ones carrying
 * information.
 *
 * ## Chrome clearance
 *
 * The navbar and the announcement banner float over the top of the page, and
 * the banner can be dismissed — so the space they occupy is not constant.
 * The content column starts below `--chrome-h`, which is the token sized for
 * the taller case (banner up). Dismissing it only ever gives the hero more
 * room, never less, so the label and the top of the cluster cannot end up
 * behind the chrome.
 */

/**
 * The cluster, placed by hand.
 *
 * Percentages rather than pixels, so it scales with the section instead of
 * bunching at one width. Positions overlap the wordmark and run off the right
 * edge on purpose — a cluster that politely stays inside the safe area reads
 * as a row of icons, not as something scattered.
 *
 * `depth` and `blur` move together: near stickers lean further and stay
 * sharp, far ones barely move and go soft.
 */
const STICKERS: HeroSticker[] = [
  // --- desktop: behind the wordmark, softer and further away ------------
  {
    id: "burst",
    left: "50%",
    top: "22%",
    size: 96,
    tilt: -14,
    depth: 8,
    blur: 2.4,
    layer: "behind",
    bob: -10,
    bobDur: 13,
    bobDelay: 0,
    only: "desktop",
  },
  {
    id: "cloud",
    left: "77%",
    top: "21%",
    size: 74,
    tilt: 9,
    depth: 6,
    blur: 3,
    layer: "behind",
    bob: -7,
    bobDur: 15,
    bobDelay: 1400,
    only: "desktop",
  },
  {
    id: "code",
    left: "38%",
    top: "58%",
    size: 84,
    tilt: 11,
    depth: 10,
    blur: 1.6,
    layer: "behind",
    bob: -9,
    bobDur: 12,
    bobDelay: 700,
    only: "desktop",
  },
  // --- desktop: in front, sharp, leaning most ---------------------------
  {
    id: "cup",
    left: "43%",
    top: "36%",
    size: 104,
    tilt: -8,
    depth: 26,
    blur: 0,
    layer: "front",
    bob: -14,
    bobDur: 9,
    bobDelay: 300,
    only: "desktop",
  },
  {
    id: "spark",
    left: "62%",
    top: "44%",
    size: 74,
    tilt: 16,
    depth: 20,
    blur: 0,
    layer: "front",
    bob: -11,
    bobDur: 11,
    bobDelay: 900,
    only: "desktop",
  },
  {
    id: "pin",
    left: "56%",
    top: "70%",
    size: 88,
    tilt: -6,
    depth: 24,
    blur: 0,
    layer: "front",
    bob: -12,
    bobDur: 10,
    bobDelay: 1800,
    only: "desktop",
  },
  {
    id: "terminal",
    left: "13%",
    top: "26%",
    size: 92,
    tilt: 7,
    depth: 22,
    blur: 0,
    layer: "front",
    bob: -8,
    bobDur: 14,
    bobDelay: 1100,
    only: "desktop",
  },
  // --- desktop: bleeding off the right edge -----------------------------
  {
    id: "bolt",
    left: "95%",
    top: "60%",
    size: 104,
    tilt: 22,
    depth: 18,
    blur: 0,
    layer: "front",
    bob: -10,
    bobDur: 12,
    bobDelay: 2300,
    only: "desktop",
  },

  /*
    Mobile: three, in the bands the stacked layout leaves empty — beside the
    tagline, under the figures, and off the right edge. The desktop set put
    one squarely on top of "Check the swag", which is what authoring the
    cluster once and hoping taught us.
  */
  {
    id: "spark",
    left: "72%",
    top: "17%",
    size: 64,
    tilt: 14,
    depth: 16,
    blur: 0,
    layer: "front",
    bob: -9,
    bobDur: 11,
    bobDelay: 400,
    only: "mobile",
  },
  {
    id: "pin",
    left: "63%",
    top: "68%",
    size: 72,
    tilt: -7,
    depth: 20,
    blur: 0,
    layer: "front",
    bob: -11,
    bobDur: 10,
    bobDelay: 1500,
    only: "mobile",
  },
  {
    id: "burst",
    left: "88%",
    top: "45%",
    size: 70,
    tilt: -12,
    depth: 9,
    blur: 2,
    layer: "behind",
    bob: -8,
    bobDur: 14,
    bobDelay: 900,
    only: "mobile",
  },
];

export async function Hero({
  locale,
  photo,
}: {
  locale: string;
  /** The hero's one photograph, from the content store. */
  photo: PastEditionPhoto | undefined;
}) {
  const t = await getTranslations("home.hero");
  const lang = locale === "en" ? "en" : "fr";
  const when = eventDateParts(lang);

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-pastel">
      <HeroBackdrop
        src={photo?.imageUrl}
        alt={photo?.alt?.[lang] ?? t("photoAlt")}
      />

      <HeroField className="relative flex flex-1 flex-col px-5 sm:px-8">
        {/* Behind the wordmark, in front of the backdrop. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <HeroStickers stickers={STICKERS} locale={lang} layer="behind" />
        </div>

        {/* ---------- The right column: the argument ---------- */}

        {/*
          `mt-[--chrome-h]` is the clearance the floating navbar and banner
          need. It is the banner-up height, so dismissing the banner only
          adds room.
        */}
        {/*
          `max()` is the chrome-clearance guarantee from the brief. The column
          wants to sit around a quarter of the way down, matching the
          reference — but on a short window a quarter of the height is less
          than the navbar and banner occupy, and the tagline would slide
          underneath them. Whichever is larger wins, so dismissing the banner
          only ever gives the hero more room.
        */}
        <div className="relative z-20 mt-[max(var(--chrome-h),24vh)] sm:absolute sm:right-8 sm:top-[max(var(--chrome-h),24vh)] sm:mt-0 sm:w-[21rem] lg:w-[23rem]">
          <div>
            <p
              className="hero-settle text-body-l text-black02/85"
              style={{ ["--settle-delay" as string]: "260ms" }}
            >
              {t("tagline")}
            </p>

            <div
              className="hero-settle mt-7 flex flex-wrap items-center gap-3"
              style={{ ["--settle-delay" as string]: "340ms" }}
            >
              <Button tone="primary" href="/tickets" size="lg">
                {t("ctaPrimary")}
              </Button>
              <Button tone="black02" variant="secondary" href="/shop" size="lg">
                {t("ctaSecondary")}
              </Button>
            </div>

            {/*
              The figures. Where the reference puts "98% / 120+", we put the
              two facts a visitor actually needs, set the same way: a loud
              value over a quiet caption. Static — see the note at the top of
              the file about which things in this hero move.
            */}
            <dl
              className="hero-settle mt-10 flex flex-wrap gap-x-12 gap-y-6"
              style={{ ["--settle-delay" as string]: "440ms" }}
            >
              {when && (
                <div>
                  <dt className="sr-only">{t("dateLabel")}</dt>
                  <dd>
                    <span className="block font-sans text-display-l font-bold leading-none text-black02">
                      {when.value}
                    </span>
                    <span className="mt-2 block max-w-36 font-mono text-mono-tag uppercase tracking-wide text-black02/55">
                      {when.caption}
                    </span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="sr-only">{t("venueLabel")}</dt>
                <dd>
                  <span className="block font-sans text-display-l font-bold leading-none text-black02">
                    {EVENT.city}
                  </span>
                  <span className="mt-2 block max-w-36 font-mono text-mono-tag uppercase tracking-wide text-black02/55">
                    {EVENT.venue ?? t("venueCaption")}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ---------- The left column: the mass ---------- */}

        <div className="relative z-20 mt-auto pb-[2vh]">
          {/*
            The label: our mark plus who is putting this on, in the slot the
            reference gives its own small-caps line. Quiet on purpose — it is
            a credit, and the thing under it is the loud one.
          */}
          <div
            className="hero-settle mb-5 flex items-center gap-3"
            style={{ ["--settle-delay" as string]: "180ms" }}
          >
            <DevFestLogo
              animateIn
              interactive
              title="DevFest"
              className="h-7 w-auto shrink-0 cursor-pointer sm:h-8"
            />
            <span className="font-mono text-mono-tag font-bold uppercase tracking-[0.16em] text-black02/60">
              {EVENT.organizer}
            </span>
          </div>

          {/*
            Sized against measured boxes, not guessed. Two earlier attempts
            put the bottom of "Yaoundé" below the fold on a 1440×900 screen —
            the reference crops its own second line slightly, but half a
            missing line reads as a bug rather than as a crop.

            `2xl` steps it back down: `vw` sizing on a 2560px monitor produced
            a wordmark half the viewport tall, which is past confident and
            into unreadable.
          */}
          <div className="text-[17vw] sm:text-[13.5vw] 2xl:text-[10.5vw]">
            <HeroWordmark srLabel={t("headline", { year: EVENT.year })} />
          </div>
        </div>

        {/* In front of the wordmark. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
          <HeroStickers stickers={STICKERS} locale={lang} layer="front" />
        </div>
      </HeroField>
    </section>
  );
}
