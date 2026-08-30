"use client";

import { X } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { PersonDetail } from "@/components/people/PersonDetail";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { PopoverSide } from "@/lib/popover-anchor";
import type { Speaker } from "@/data/types";

export interface SpeakerCardProps {
  speaker: Speaker;
  open: boolean;
  /**
   * Receives the card's own root element so the grid can measure which way
   * the popover should open before it opens. Passing the node beats a ref
   * in the parent: the parent renders N cards and would need N refs.
   */
  onToggle: (card: Element | null) => void;
  onClose?: () => void;
  /** Resting tilt applied when this card is the spotlight focus. */
  tilt?: number;
  focused?: boolean;
  /**
   * Grid mode (PHASE11 §8): opening pops the detail out BESIDE the card as an
   * overlay, so the grid never reflows. The slider leaves this off — there
   * the card is the stage and the detail swipes up over it.
   */
  popover?: boolean;
  /** Which way the popover opens; measured by the grid at click time. */
  side?: PopoverSide;
  /** Off on the home teaser — see `PersonDetail.personality` (PHASE11 §7). */
  personality?: boolean;
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
 * - Slider (`popover` off): the detail swipes up over the card's own image,
 *   transform-driven, staying mounted.
 * - Grid (`popover` on): the card itself never changes size. The detail opens
 *   as a panel BESIDE it, layered over the grid. PHASE10 expanded the card
 *   in place instead, which reflowed every card in the row on every click;
 *   this keeps the grid perfectly still.
 *
 * In both, the panel stays mounted and `inert` keeps its contents out of the
 * tab order and accessibility tree while closed.
 */
export function SpeakerCard({
  speaker,
  open,
  onToggle,
  onClose,
  tilt = -2,
  focused = false,
  popover = false,
  side = "right",
  personality = true,
  className = "",
}: SpeakerCardProps) {
  const locale = useLocale() as "fr" | "en";
  const t = useTranslations("common.filters");

  return (
    <article
      className={`speaker-card relative ${focused ? "is-focused" : ""} ${
        open ? "is-open" : ""
      } ${popover ? "is-popover" : ""} ${
        open && popover ? `is-open-${side}` : ""
      } ${className}`}
      style={{ ["--card-tilt" as string]: `${tilt}deg` }}
    >
      <button
        type="button"
        onClick={(e) => onToggle(e.currentTarget.closest("article"))}
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

          {/* Resting caption. In the slider it fades out behind the swipe-up
              panel; in the grid it stays, because the detail sits beside the
              card rather than over it. */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-offwhite px-5 py-4 transition-opacity duration-200 ${
              open && !popover ? "opacity-0" : "opacity-100"
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
      </button>

      {/*
        Detail. Grid: a popover anchored beside the card (see .person-pop).
        Slider: absolutely positioned over the card and translated up.
        Body is the shared PersonDetail, so the icebreaker Q&A and funny
        moment render identically here, on TeamCard and in the slider.
      */}
      <div
        id={`speaker-detail-${speaker.id}`}
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
        <PersonDetail
          person={speaker}
          tone="dark"
          interactive={open}
          personality={personality}
        />
      </div>
    </article>
  );
}
