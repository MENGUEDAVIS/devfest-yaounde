"use client";

import { useLocale } from "next-intl";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { Speaker } from "@/data/types";

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
              {/* Signature moment (/speakers): a marker stroke wipes in under
                  the name on hover/focus — see .name-marker in motion.css */}
              <span className="name-marker">{speaker.name}</span>
            </p>
            <p className="mt-1 truncate text-body-m text-black02/70">
              {speaker.role[locale]}
            </p>
          </div>

          {/* Swipe-up detail — transform-driven, stays mounted.
              Body is the shared PersonDetail, so the icebreaker Q&A and
              funny moment render identically here, on TeamCard and in the
              slider. */}
          <div
            id={`speaker-detail-${speaker.id}`}
            inert={!open}
            className="speaker-detail absolute inset-0 overflow-y-auto bg-black02/92 px-6 py-6 text-left"
          >
            <PersonDetail person={speaker} tone="dark" interactive={open} />
          </div>
        </div>
      </button>
    </article>
  );
}
