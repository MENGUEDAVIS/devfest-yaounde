"use client";

import { FunnelSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { BottomSheet } from "./BottomSheet";
import { Modal } from "./Modal";

/**
 * Laptop and up gets the slide-in sidebar. 1024px is deliberately low: the
 * previous margin-float rail needed 1760px, which no 14" laptop has, so on the
 * machine most people actually use the filters did not render at all.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

export interface FilterLayoutProps {
  /** The filter groups (and search). Rendered into whichever surface is live. */
  filters: ReactNode;
  /** How many filters are currently active — drives the button badge. */
  activeCount?: number;
  onClearAll?: () => void;
  /**
   * Heading for the panel. Defaults to "Filters"; /faqs overrides it because
   * its panel is a search + jump nav, not a filter set.
   */
  title?: string;
  /** Optional controls pinned above the content, e.g. a view toggle. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * The shared filtered-page layout. Used by /speakers, /schedule, /team, /faqs
 * and /shop, so there is ONE implementation rather than five.
 *
 * ONE BUTTON, THREE SURFACES — PHASE14 §1. The trigger is identical
 * everywhere; only the surface it opens changes with the viewport:
 *
 * | Viewport            | Surface                                  |
 * | ------------------- | ---------------------------------------- |
 * | Laptop & desktop    | Slide-in panel from the LEFT, over a scrim |
 * | Tablet              | Bottom sheet, width-capped and centred   |
 * | Mobile              | Bottom sheet, full width                  |
 *
 * WHY THIS REPLACED THE MARGIN RAIL. Phases 10–12 floated the rail in the
 * page's left margin so the content column kept its full width. That works
 * beautifully at 1760px and does not exist below it — and a 14" laptop is
 * ~1512px, so the filters were simply absent on the most common machine.
 * Trading the margin trick for a panel that opens on demand costs one click
 * and works at every size.
 *
 * Both surfaces are the shared overlay components (`Modal` / `BottomSheet`),
 * so the focus trap, Escape, scrim-dismiss and scroll lock have one
 * implementation between them (ADR 0012) — this file adds no overlay
 * mechanics of its own.
 *
 * Only ONE surface is mounted at a time, chosen by media query rather than by
 * CSS `hidden`. That matters for more than bytes: two mounted copies would
 * mean two sets of `useId()`-generated ids and two tab stops for the same
 * control.
 */
export function FilterLayout({
  filters,
  activeCount = 0,
  onClearAll,
  title,
  toolbar,
  children,
}: FilterLayoutProps) {
  const t = useTranslations("common.filters");
  const heading = title ?? t("title");
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const close = () => setOpen(false);

  const body = <div className="flex flex-col gap-5">{filters}</div>;

  const clearButton = activeCount > 0 && onClearAll && (
    <button
      type="button"
      onClick={onClearAll}
      className="rounded-pill border-2 border-black02 px-5 py-3 font-sans text-body-m font-bold text-black02 transition-colors hover:bg-pastel"
    >
      {t("clear")}
    </button>
  );

  return (
    <div className="filter-section relative">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <button
          ref={openerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
        >
          <FunnelSimple size={18} weight="bold" aria-hidden />
          {t("open")}
          {activeCount > 0 && (
            <span className="rounded-pill bg-primary px-2 py-0.5 font-mono text-mono-tag">
              {activeCount}
            </span>
          )}
        </button>
        {toolbar}
      </div>

      {children}

      {/* ---- Laptop & desktop: slide-in panel from the left ---- */}
      {isDesktop ? (
        <Modal
          open={open}
          onClose={close}
          variant="drawer-left"
          closeLabel={t("close")}
        >
          <h2 className="mb-6 shrink-0 pr-12 font-sans text-heading-l font-bold text-black02">
            {heading}
          </h2>
          {/* Only the body scrolls, so the heading and actions stay put. */}
          <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
          <div className="mt-6 flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
            >
              {t("done")}
            </button>
            {clearButton}
          </div>
        </Modal>
      ) : (
        /* ---- Tablet & mobile: the shared bottom sheet ---- */
        <BottomSheet
          open={open}
          onClose={close}
          title={heading}
          closeLabel={t("close")}
          footer={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
              >
                {t("done")}
              </button>
              {clearButton}
            </div>
          }
        >
          {body}
        </BottomSheet>
      )}
    </div>
  );
}
