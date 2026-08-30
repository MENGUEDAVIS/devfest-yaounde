"use client";

import { X } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { PopoverSide } from "@/lib/popover-anchor";
import type { TeamMember } from "@/data/types";

export interface TeamCardProps {
  member: TeamMember;
  open: boolean;
  onToggle: (card: Element | null) => void;
  onClose?: () => void;
  tilt?: number;
  /** See `SpeakerCard.popover` — grid pops out beside, slider swipes up. */
  popover?: boolean;
  side?: PopoverSide;
  className?: string;
}

/**
 * Team member card — the same detail interaction as `SpeakerCard`, so the two
 * people-pages behave identically (PHASE9 §4 / ADR 0009). That includes the
 * popover grid mode and, importantly, the DOM placement rule behind it: the
 * swipe-up panel must live inside the clipping frame, the popover must live
 * outside it. See the comment on `SpeakerCard` for why.
 */
export function TeamCard({
  member,
  open,
  onToggle,
  onClose,
  tilt = -2,
  popover = false,
  side = "right",
  className = "",
}: TeamCardProps) {
  const locale = useLocale() as "fr" | "en";
  const t = useTranslations("common.filters");

  const detail = (
    <div
      id={`team-detail-${member.id}`}
      inert={!open}
      className={
        popover
          ? "person-pop scroll-on-dark rounded-lg border-2 border-black02 bg-black02 px-6 py-6 text-left shadow-[0_8px_0_0_var(--color-black02)]"
          : "speaker-detail scroll-on-dark absolute inset-0 overflow-y-auto bg-black02/92 px-6 py-6 text-left"
      }
    >
      {popover && (
        <button
          type="button"
          onClick={(e) =>
            onClose ? onClose() : onToggle(e.currentTarget.closest("article"))
          }
          aria-label={t("close")}
          className="absolute right-4 top-4 rounded-pill border-2 border-offwhite/45 p-1.5 text-offwhite transition-colors hover:bg-offwhite hover:text-black02"
        >
          <X size={16} weight="bold" />
        </button>
      )}
      <PersonDetail person={member} tone="dark" interactive={open} />
    </div>
  );

  return (
    <article
      className={`speaker-card relative ${open ? "is-open" : ""} ${
        popover ? "is-popover" : ""
      } ${open && popover ? `is-open-${side}` : ""} ${className}`}
      style={{ ["--card-tilt" as string]: `${tilt}deg` }}
    >
      <button
        type="button"
        onClick={(e) => onToggle(e.currentTarget.closest("article"))}
        aria-expanded={open}
        aria-controls={`team-detail-${member.id}`}
        className="block w-full text-left"
      >
        <div className="relative overflow-hidden rounded-lg border-2 border-black02 shadow-[0_6px_0_0_var(--color-black02)]">
          <MorphedImageFrame
            src={member.photoUrl}
            alt={member.name}
            aspectRatio="4/5"
            className="rounded-none border-0"
          />

          <div
            className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${
              open && !popover ? "opacity-0" : "opacity-100"
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
                .anim-contrib-stamp. It carries more weight now that the grid
                is no longer grouped by contribution. */}
            <div className="anim-contrib-stamp mt-2.5 inline-block">
              <Badge tone="primary" variant="outline">
                {member.contribution[locale]}
              </Badge>
            </div>
          </div>

          {!popover && detail}
        </div>
      </button>

      {popover && detail}
    </article>
  );
}
