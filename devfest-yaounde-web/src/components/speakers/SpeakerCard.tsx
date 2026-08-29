"use client";

import { GlobeSimple, LinkedinLogo, XLogo } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { Speaker } from "@/data/types";

/** Social links, rendered only for the networks a speaker actually has. */
export function speakerSocials(s: Speaker) {
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

export interface SpeakerCardProps {
  speaker: Speaker;
  open: boolean;
  onToggle: () => void;
  /** Resting tilt applied when this card is the spotlight focus. */
  tilt?: number;
  focused?: boolean;
  className?: string;
}

/**
 * One speaker card with the swipe-up detail overlay.
 *
 * Extracted from the Home slider in PHASE8 so the full `/speakers` grid uses
 * the SAME interaction rather than a second, divergent modal implementation
 * (see docs/decisions/0009-speaker-interaction.md). The slider adds
 * spotlight/auto-advance around it; the grid just lays these out.
 *
 * Clicking swipes a detail panel up over the card's own image. The panel
 * stays mounted and is translated out of view, with `inert` keeping its
 * contents out of the tab order and accessibility tree while closed.
 */
export function SpeakerCard({
  speaker,
  open,
  onToggle,
  tilt = -2,
  focused = false,
  className = "",
}: SpeakerCardProps) {
  const locale = useLocale() as "fr" | "en";
  const socials = speakerSocials(speaker);

  return (
    <article
      className={`speaker-card relative ${focused ? "is-focused" : ""} ${open ? "is-open" : ""} ${className}`}
      style={{ ["--card-tilt" as string]: `${tilt}deg` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`speaker-detail-${speaker.id}`}
        className="block w-full text-left"
      >
        <div className="relative overflow-hidden rounded-lg border-2 border-black02 shadow-[0_6px_0_0_var(--color-black02)]">
          <MorphedImageFrame
            src={speaker.photoUrl}
            alt={speaker.name}
            aspectRatio="4/5"
            className="rounded-none border-0"
          />

          {/* Resting caption — fades out once the detail is up */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          >
            <p className="font-sans text-heading-m font-bold leading-tight text-black02">
              {speaker.name}
            </p>
            <p className="mt-1 truncate text-body-m text-black02/70">
              {speaker.role[locale]}
            </p>
          </div>

          {/* Swipe-up detail — transform-driven, stays mounted */}
          <div
            id={`speaker-detail-${speaker.id}`}
            inert={!open}
            className="speaker-detail absolute inset-0 flex flex-col justify-end overflow-y-auto bg-black02/92 px-6 py-6 text-left"
          >
            <p className="font-sans text-heading-l font-bold leading-tight text-offwhite">
              {speaker.name}
            </p>
            <p className="mt-1.5 font-mono text-caption text-yellow">
              {speaker.role[locale]} · {speaker.company}
            </p>
            <p className="mt-4 text-body-m leading-relaxed text-offwhite/85">
              {speaker.bio[locale]}
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-2.5">
                {socials.map(({ key, href, Icon, label }) => (
                  <a
                    key={key}
                    href={href}
                    aria-label={`${speaker.name} — ${label}`}
                    tabIndex={open ? undefined : -1}
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
}
