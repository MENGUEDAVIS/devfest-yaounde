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
  /**
   * Grid mode (PHASE10 §5): opening EXPANDS the card in place — it widens to
   * two columns and grows to fit the detail beside the photo — instead of
   * swiping a cramped, inner-scrolling panel over a fixed-size card.
   * The slider leaves this off: there the card is the stage, it has room
   * already, and expanding would fight the spotlight transform.
   */
  expandInPlace?: boolean;
  className?: string;
}

/**
 * One speaker card with its detail reveal.
 *
 * Extracted from the Home slider in PHASE8 so the full `/speakers` grid uses
 * the SAME interaction rather than a second, divergent modal implementation
 * (see docs/decisions/0009-speaker-interaction.md).
 *
 * Two presentations of one interaction:
 * - Slider (`expandInPlace` off): the detail swipes up over the card's own
 *   image, transform-driven, staying mounted.
 * - Grid (`expandInPlace` on): the card itself grows into the space beside
 *   it, photo left / detail right, so the answer is read at full size.
 *
 * In both, the panel stays mounted and `inert` keeps its contents out of the
 * tab order and accessibility tree while closed.
 */
export function SpeakerCard({
  speaker,
  open,
  onToggle,
  tilt = -2,
  focused = false,
  expandInPlace = false,
  className = "",
}: SpeakerCardProps) {
  const locale = useLocale() as "fr" | "en";
  const expanded = expandInPlace && open;

  return (
    <article
      className={`speaker-card relative ${focused ? "is-focused" : ""} ${
        open ? "is-open" : ""
      } ${expandInPlace ? "is-expandable" : ""} ${
        expanded ? "is-expanded" : ""
      } ${className}`}
      style={{ ["--card-tilt" as string]: `${tilt}deg` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`speaker-detail-${speaker.id}`}
        className="block h-full w-full text-left"
      >
        <div
          className={`relative h-full overflow-hidden rounded-lg border-2 border-black02 shadow-[0_6px_0_0_var(--color-black02)] ${
            expanded
              ? "grid grid-cols-1 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
              : ""
          }`}
        >
          <div className="relative">
            <MorphedImageFrame
              src={speaker.photoUrl}
              alt={speaker.name}
              aspectRatio="4/5"
              className="rounded-none border-0"
            />

            {/* Resting caption. In the slider it fades out behind the
                swipe-up panel; when the card expands it stays, because the
                detail now sits beside the photo rather than over it. */}
            <div
              className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${
                open && !expandInPlace ? "opacity-0" : "opacity-100"
              }`}
            >
              <p className="font-sans text-heading-m font-bold leading-tight text-black02">
                {speaker.name}
              </p>
              <p className="mt-1 truncate text-body-m text-black02/70">
                {speaker.role[locale]}
              </p>
            </div>
          </div>

          {/*
            Detail. Expanded: a normal grid column that sizes to its content,
            capped by --detail-max so a long answer can't make one card tower
            over the grid. Slider: absolutely positioned and translated up.
            Body is the shared PersonDetail, so the icebreaker Q&A and funny
            moment render identically here, on TeamCard and in the slider.
          */}
          <div
            id={`speaker-detail-${speaker.id}`}
            inert={!open}
            className={`speaker-detail scroll-on-dark bg-black02/92 px-6 py-6 text-left ${
              expandInPlace
                ? "max-h-[var(--detail-max)] overflow-y-auto"
                : "absolute inset-0 overflow-y-auto"
            }`}
          >
            <PersonDetail person={speaker} tone="dark" interactive={open} />
          </div>
        </div>
      </button>
    </article>
  );
}
