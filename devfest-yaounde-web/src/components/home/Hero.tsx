import {
  ArrowDown,
  CalendarBlank,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import { HeroField, Satellite } from "@/components/home/HeroField";
import { HeroWordmark } from "@/components/home/HeroWordmark";
import { EVENT, formatEventDates } from "@/lib/event";

/**
 * The landing hero — a clean-sheet redesign (ADR 0044).
 *
 * ## What it replaced, and why none of it came back
 *
 * The old hero was a centred stack of text over a drifting collage of
 * eighteen photographs. It was expensive, it packed and clipped on a phone,
 * and — the actual problem — it was forgettable. Every element sat in one
 * column in the middle of the screen, which is the layout a page falls into
 * when nobody decides on one.
 *
 * ## The composition
 *
 * **The mass is at the BOTTOM.** The navbar owns the top, so the hero's star
 * element hugs the lower edge and the space above it is left deliberately
 * empty. That emptiness is the design: a huge thing in a crowded frame is
 * just noise, and the same thing with room around it reads as confident
 * (DESIGN.md §7b — "exaggerated size only reads as confident if it has
 * room").
 *
 * **The facts float.** Date and venue are not a text block under a headline;
 * they are placed around the empty half, absolutely positioned, leaning
 * toward the pointer. They cost no layout space, which is what lets the
 * wordmark have all of it.
 *
 * **Two flat shapes and the bracket mark** furnish the upper space. Three
 * elements, each large and each doing one job, rather than a texture of small
 * ones. Flat fills only.
 *
 * ## It has to work standing still
 *
 * Under `prefers-reduced-motion` nothing here moves: no reveal, no drift, no
 * cursor response. What is left is the composition — the giant bottom-anchored
 * wordmark, the placed facts, the negative space, two shapes — which is the
 * thing that was designed. The motion is a reward for the people who can take
 * it, never the reason the screen works.
 */
export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations("home.hero");
  const lang = locale === "en" ? "en" : "fr";
  /* Real data, from the list that also fills the .ics files and the OG card. */
  const dates = formatEventDates(lang);

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-pastel">
      <HeroField className="relative flex flex-1 flex-col">
        {/*
          THREE HORIZONTAL BANDS, and every absolute position below belongs to
          exactly one of them. Written down because a floating layout has no
          layout engine to stop two things sharing a spot — the first pass put
          the venue pill on top of the wordmark and the eyebrow under the
          navbar, and both are invisible until somebody looks.

            0   – 24vh   the fixed chrome (--chrome-h is 13rem). Keep clear.
            24  – 56vh   satellites and shapes. The composed empty half.
            56  – 100vh  the bottom cluster: tagline, CTAs, wordmark.
        */}

        {/* ---------- The empty upper half, furnished ---------- */}

        {/*
          Two shapes, sized the way §7b asks for — one big bold shape beats
          five timid ones. They are `bg-primary` and `bg-halftone`, so the
          theme switcher repaints them with everything else, and they are
          behind the facts in both z-order and parallax depth.
        */}
        <div
          aria-hidden
          className="hero-shape pointer-events-none absolute -right-[14vmin] top-[26vh] -z-10 h-[34vmin] w-[34vmin] rounded-pill bg-primary/80 lg:right-[4vw]"
          style={{ ["--depth" as string]: "46px" }}
        />
        <div
          aria-hidden
          className="hero-shape pointer-events-none absolute -left-[8vmin] top-[40vh] -z-10 h-[20vmin] w-[20vmin] rotate-12 rounded-lg bg-halftone/60 sm:left-[2vw]"
          style={{ ["--depth" as string]: "70px" }}
        />

        {/*
          THE FLOATING LAYER IS FOR SCREENS THAT HAVE ROOM, and `sm` is where
          they stop having it.

          On a 390×844 phone the bottom cluster — tagline, two CTAs, a
          two-line wordmark — already reaches past halfway, so a fact
          positioned at "41vh" lands on top of the tagline. It did, and it was
          unreadable. No amount of tuning the percentages survives a cluster
          whose height depends on how long the French copy runs.

          So below `sm` the same facts are laid out statically in the cluster
          (further down), which is the "tasteful static placement" the brief
          asks for on touch — and which cannot collide with anything, because
          it is in the flow.
        */}
        <div className="hidden sm:contents">
          {/* The bracket mark, big and clickable — the split-and-spin egg. */}
          <Satellite
            depth={26}
            tilt={-3}
            float={-14}
            drift={11}
            settle={160}
            className="left-[7vw] top-[27vh] lg:left-[9vw]"
          >
            <DevFestLogo
              animateIn
              interactive
              title="DevFest"
              className="h-14 w-auto cursor-pointer sm:h-20 lg:h-24"
            />
          </Satellite>

          {/* ---------- The floating facts ---------- */}

          {/*
          DOM ORDER IS READING ORDER: presented-by, then when, then where,
          then the tagline. Where each one sits on screen is a `top`/`left`,
          which a screen reader never sees — so the composition can be
          scattered while the content stays a sensible sequence.
        */}
          <Satellite
            depth={12}
            tilt={2}
            float={-8}
            drift={8}
            delay={600}
            settle={240}
            /* Under the bracket mark, not opposite it. On the right it sat on
             the yellow circle, where dark-on-yellow at caption size is not a
             contrast anybody should have to work at — and it pairs with the
             GDG mark anyway, which is whose name it is. */
            className="left-[7vw] top-[calc(27vh+7rem)] lg:left-[9vw] lg:top-[calc(27vh+8.5rem)]"
          >
            <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
              {t("eyebrow")}
            </p>
          </Satellite>

          <Satellite
            depth={22}
            tilt={-2}
            float={-12}
            drift={10}
            delay={300}
            settle={320}
            /* Below the eyebrow's band, never beside it: at 1440 the two were
             a few pixels apart and the pill's border cropped the last letter
             of "PRÉSENTE". */
            className="left-[7vw] top-[47vh] sm:left-[16vw] lg:left-[22vw]"
          >
            <Fact icon={<CalendarBlank size={16} weight="bold" aria-hidden />}>
              <span className="sr-only">{t("dateLabel")}: </span>
              {dates}
            </Fact>
          </Satellite>

          <Satellite
            depth={18}
            tilt={3}
            float={-9}
            drift={12}
            delay={1200}
            settle={400}
            skittish
            className="right-[7vw] top-[37vh] sm:right-[12vw] lg:right-[16vw]"
          >
            <Fact icon={<MapPin size={16} weight="bold" aria-hidden />}>
              <span className="sr-only">{t("venueLabel")}: </span>
              {EVENT.venue ?? t("venue")}
            </Fact>
          </Satellite>
        </div>

        {/* ---------- The bottom cluster ---------- */}

        <div className="mt-auto w-full px-4 pb-4 sm:px-6 sm:pb-6">
          {/*
            The tagline and the way forward, on one row above the wordmark.
            A conference landing page still has to sell a ticket — the brief
            moved the FACTS out of a stacked block, not the action.
          */}
          {/*
            The phone's copy of the facts: in the flow, above the tagline, so
            nothing can land on anything. Hidden from `sm` up, where the
            floating layer takes over.
          */}
          <div className="mb-5 flex flex-wrap items-center gap-2 sm:hidden">
            <Fact icon={<CalendarBlank size={14} weight="bold" aria-hidden />}>
              <span className="sr-only">{t("dateLabel")}: </span>
              {dates}
            </Fact>
            <Fact icon={<MapPin size={14} weight="bold" aria-hidden />}>
              <span className="sr-only">{t("venueLabel")}: </span>
              {EVENT.venue ?? t("venue")}
            </Fact>
          </div>

          {/*
            NO max-width, and that is the point: the wordmark below is
            full-bleed to the section's padding, so anything that does not
            share its left and right edges reads as misaligned. On a 2560
            screen a centred `max-w-[100rem]` started the tagline 400px inside
            a headline that starts at the edge.
          */}
          <div className="relative z-10 flex flex-col items-start gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <p
              className="hero-settle max-w-md text-body-l text-black02/80"
              style={{ ["--settle-delay" as string]: "480ms" }}
            >
              {t("tagline")}
            </p>

            <div
              className="hero-settle flex shrink-0 flex-wrap items-center gap-3"
              style={{ ["--settle-delay" as string]: "560ms" }}
            >
              <Button tone="primary" href="/tickets" size="lg">
                {t("ctaPrimary")}
              </Button>
              <Button tone="black02" variant="secondary" href="/shop" size="lg">
                {t("ctaSecondary")}
              </Button>
            </div>
          </div>

          {/*
            THE STAR. Full-bleed to the section's padding, hugging the bottom
            edge. `-mb-[1.5vw]` crops the wordmark's own descender space
            against the viewport edge, which is what makes it read as anchored
            TO the edge rather than sitting near it.
          */}
          <div className="-mb-[1.2vw]">
            <HeroWordmark srLabel={t("headline", { year: EVENT.year })} />
          </div>
        </div>
      </HeroField>

      {/*
        The scroll cue, bottom-right and quiet. It is the one piece of the
        composition that admits there is more page — the whole point of the
        hero is that you forget for a moment.
      */}
      {/*
        Bottom-right put it directly on the wordmark's é. It lives in the gap
        between the floating layer and the cluster instead — the one band of
        the composition nothing else is using.
      */}
      <span
        aria-hidden
        className="hero-settle pointer-events-none absolute left-1/2 top-[57vh] hidden -translate-x-1/2 items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/40 lg:flex"
        style={{ ["--settle-delay" as string]: "900ms" }}
      >
        {t("scrollCue")}
        <ArrowDown size={14} weight="bold" />
      </span>
    </section>
  );
}

/**
 * A floating fact: a chunky pill, big enough to read across the room.
 *
 * §7b again — these are the only text in the upper half, so they carry the
 * boldness there. A 12px caption floating in that much space would look like
 * a mistake rather than a decision.
 */
function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="inline-flex items-center gap-2.5 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 shadow-[0_4px_0_0_var(--color-black02)]">
      {icon}
      {children}
    </p>
  );
}
