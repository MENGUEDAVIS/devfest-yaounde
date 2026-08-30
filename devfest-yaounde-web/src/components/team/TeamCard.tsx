"use client";

import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { TeamMember } from "@/data/types";

export interface TeamCardProps {
  member: TeamMember;
  open: boolean;
  onToggle: () => void;
  tilt?: number;
  /** See `SpeakerCard.expandInPlace` — grid expands, slider swipes up. */
  expandInPlace?: boolean;
  className?: string;
}

/**
 * Team member card — the same detail interaction as `SpeakerCard`, so the two
 * people-pages behave identically (PHASE9 §4 / ADR 0009). That includes
 * PHASE10 §5's expand-in-place grid mode: it would be a divergent fork for
 * the team grid to keep inner-scrolling while the speaker grid expands.
 *
 * The revealed panel uses the shared `PersonDetail`, which is what makes the
 * icebreaker Q&A, funny moment and contribution render the same way here as
 * on the speaker card and in the slider.
 */
export function TeamCard({
  member,
  open,
  onToggle,
  tilt = -2,
  expandInPlace = false,
  className = "",
}: TeamCardProps) {
  const locale = useLocale() as "fr" | "en";
  const expanded = expandInPlace && open;

  return (
    <article
      className={`speaker-card relative ${open ? "is-open" : ""} ${
        expandInPlace ? "is-expandable" : ""
      } ${expanded ? "is-expanded" : ""} ${className}`}
      style={{ ["--card-tilt" as string]: `${tilt}deg` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`team-detail-${member.id}`}
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
              src={member.photoUrl}
              alt={member.name}
              aspectRatio="4/5"
              className="rounded-none border-0"
            />

            <div
              className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${
                open && !expandInPlace ? "opacity-0" : "opacity-100"
              }`}
            >
              <p className="font-sans text-heading-m font-bold leading-tight text-black02">
                {member.name}
              </p>
              <p className="mt-1 truncate text-body-m text-black02/70">
                {member.role[locale]}
              </p>
              {/* Signature moment (/team): the contribution chip lands like a
                  rubber stamp when the card scrolls in — see
                  .anim-contrib-stamp. Decorative motion only; the same text is
                  also in the detail panel. */}
              <div className="anim-contrib-stamp mt-2.5 inline-block">
                <Badge tone="primary" variant="outline">
                  {member.contribution[locale]}
                </Badge>
              </div>
            </div>
          </div>

          <div
            id={`team-detail-${member.id}`}
            inert={!open}
            className={`speaker-detail scroll-on-dark bg-black02/92 px-6 py-6 text-left ${
              expandInPlace
                ? "max-h-[var(--detail-max)] overflow-y-auto"
                : "absolute inset-0 overflow-y-auto"
            }`}
          >
            <PersonDetail person={member} tone="dark" interactive={open} />
          </div>
        </div>
      </button>
    </article>
  );
}
