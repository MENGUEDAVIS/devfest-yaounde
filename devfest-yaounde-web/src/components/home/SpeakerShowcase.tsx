"use client";

import {
  CaretLeft,
  CaretRight,
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Reveal } from "@/components/ui/Reveal";
import speakers from "@/data/speakers.json";
import type { Speaker } from "@/data/types";

const featured = (speakers as Speaker[]).filter((s) => s.featured);

/** Alternating resting tilt so the spotlight rotation isn't uniform. */
const CARD_TILT = [-2.5, 2, -1.5, 2.5];

const AUTO_ADVANCE_MS = 3800;

/**
 * Speaker slider — PHASE7 §5 rework.
 *
 * BEFORE: a centered, container-constrained horizontal scroll area whose
 * `overflow-x: auto` clipped the cards' hover transforms, opening a modal
 * on click.
 *
 * AFTER:
 *  1. Full viewport width — the track breaks out of the page container.
 *  2. Spotlight + rotate on focus; siblings recede and dim.
 *  3. Click swipes a detail panel UP over the card's own image. No modal.
 *  4. Social links live in that panel, rendered only when provided.
 *  5. No scrollbar — prev/next controls drive a transform-based track.
 *  6. Auto-advance every ~3.8s, paused on hover/focus/interaction and
 *     disabled entirely under prefers-reduced-motion.
 *
 * THE CROP FIX (§5.1): a horizontal track needs `overflow-x: hidden`, but
 * CSS forces the other axis to `auto` the moment one axis is hidden — so a
 * card scaling/rotating on hover was being clipped vertically. Fixed by
 * giving the clipping element generous vertical padding, so the scaled card
 * never reaches the clip edge. There is no `overflow-x: hidden;
 * overflow-y: visible` combination that works here.
 */
export function SpeakerShowcase() {
  const t = useTranslations("home.speakers");
  const locale = useLocale() as "fr" | "en";

  const [focused, setFocused] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Live-tracked, not just read once — users can flip the OS setting.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Centre the focused card by MEASURING it. Card width (w-72 -> sm:w-88)
  // and gap (gap-8 -> sm:gap-10) both change at the breakpoint, so any
  // hardcoded rem step desyncs from the track padding at some widths.
  const [offset, setOffset] = useState(0);
  const recentre = useCallback(() => {
    const track = trackRef.current;
    const card = track?.children[focused] as HTMLElement | undefined;
    if (!track || !card) return;
    const viewport = track.parentElement;
    if (!viewport) return;
    setOffset(
      viewport.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
    );
  }, [focused]);

  useEffect(() => {
    recentre();
    window.addEventListener("resize", recentre);
    return () => window.removeEventListener("resize", recentre);
  }, [recentre]);

  const go = useCallback((dir: 1 | -1) => {
    setOpenId(null);
    setFocused((i) => (i + dir + featured.length) % featured.length);
  }, []);

  // Auto-advance. Never runs for reduced-motion users, and pauses whenever
  // the user is hovering, focused inside, or has a detail panel open.
  useEffect(() => {
    if (reduceMotion || paused || openId !== null) return;
    const id = setInterval(() => {
      setFocused((i) => (i + 1) % featured.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, openId]);

  function socialsFor(s: Speaker) {
    const out: {
      key: string;
      href: string;
      Icon: typeof XLogo;
      label: string;
    }[] = [];
    if (s.social?.x)
      out.push({ key: "x", href: s.social.x, Icon: XLogo, label: "X" });
    if (s.social?.linkedin)
      out.push({
        key: "in",
        href: s.social.linkedin,
        Icon: LinkedinLogo,
        label: "LinkedIn",
      });
    if (s.social?.website)
      out.push({
        key: "web",
        href: s.social.website,
        Icon: GlobeSimple,
        label: "Website",
      });
    return out;
  }

  return (
    <section className="overflow-hidden bg-yellow-pastel py-24 sm:py-32 lg:py-40">
      {/* Heading stays within the normal page measure */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-sans text-display-xl font-bold text-black02">
                {t("title")}
              </h2>
              <p className="mt-4 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/50">
                {t("hint")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("prev")}
                className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow hover:shadow-[0_6px_0_0_var(--color-black02)] active:translate-y-0.5 active:shadow-none"
              >
                <CaretLeft size={24} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("next")}
                className="flex h-14 w-14 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-[transform,background-color,box-shadow] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow hover:shadow-[0_6px_0_0_var(--color-black02)] active:translate-y-0.5 active:shadow-none"
              >
                <CaretRight size={24} weight="bold" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/*
        Full-bleed track. py-16 is the crop fix — it gives the scaled/rotated
        focused card room inside the clipping box.
      */}
      <div
        className="mt-12 w-full overflow-hidden py-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          data-spotlight="on"
          className="speaker-track flex w-max items-center gap-8 transition-transform duration-700 ease-out-devfest motion-reduce:transition-none sm:gap-10"
          style={{ transform: `translateX(${offset}px)` }}
        >
          {featured.map((s, i) => {
            const isFocused = i === focused;
            const isOpen = openId === s.id;
            const socials = socialsFor(s);
            return (
              <article
                key={s.id}
                className={`speaker-card relative w-72 shrink-0 sm:w-88 ${isFocused ? "is-focused" : ""} ${isOpen ? "is-open" : ""}`}
                style={{
                  ["--card-tilt" as string]: `${CARD_TILT[i % CARD_TILT.length]}deg`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFocused(i);
                    setOpenId(isOpen ? null : s.id);
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`speaker-detail-${s.id}`}
                  className="block w-full text-left"
                >
                  {/* The card's own image — the detail panel slides over THIS */}
                  <div className="relative overflow-hidden rounded-lg border-2 border-black02 shadow-[0_6px_0_0_var(--color-black02)]">
                    <MorphedImageFrame
                      src={s.photoUrl}
                      alt={s.name}
                      aspectRatio="4/5"
                      className="rounded-none border-0"
                    />

                    {/* Resting caption, hidden once the detail is up */}
                    <div
                      className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${isOpen ? "opacity-0" : "opacity-100"}`}
                    >
                      <p className="font-sans text-heading-m font-bold leading-tight text-black02">
                        {s.name}
                      </p>
                      <p className="mt-1 truncate text-body-m text-black02/70">
                        {s.role[locale]}
                      </p>
                    </div>

                    {/* Swipe-up detail panel — transform-driven, stays mounted */}
                    <div
                      id={`speaker-detail-${s.id}`}
                      inert={!isOpen}
                      className="speaker-detail absolute inset-0 flex flex-col justify-end bg-black02/92 px-6 py-6 text-left"
                    >
                      <p className="font-sans text-heading-l font-bold leading-tight text-offwhite">
                        {s.name}
                      </p>
                      <p className="mt-1.5 font-mono text-caption text-yellow">
                        {s.role[locale]} · {s.company}
                      </p>
                      <p className="mt-4 text-body-m leading-relaxed text-offwhite/85">
                        {s.bio[locale]}
                      </p>
                      {socials.length > 0 && (
                        <div className="mt-5 flex gap-2.5">
                          {socials.map(({ key, href, Icon, label }) => (
                            <a
                              key={key}
                              href={href}
                              aria-label={`${s.name} — ${label}`}
                              tabIndex={isOpen ? undefined : -1}
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-offwhite/30 text-offwhite transition-[background-color,color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow hover:text-black02"
                            >
                              <Icon size={20} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Button tone="black02" variant="secondary" href="/speakers" size="md">
          {t("cta")}
        </Button>
      </div>
    </section>
  );
}
