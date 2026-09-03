"use client";

import { FunnelSimple, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { BottomSheet } from "./BottomSheet";

/**
 * Where the margin rail genuinely fits. Arithmetic, not taste:
 * `50vw - 38rem (half the content column) - 1.5rem gutter - 14rem rail`
 * has to clear another 1.5rem from the screen edge, i.e. 110rem = 1760px.
 */
const RAIL_QUERY = "(min-width: 1760px)";
/** Laptop and mid-desktop: no margin to float in, so borrow width instead. */
const PUSH_QUERY = "(min-width: 1024px)";

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
 * The shared filtered-page layout — one implementation for /speakers,
 * /schedule, /team, /faqs and /shop.
 *
 * FOUR SURFACES, because the constraint really is different at each size:
 *
 * | Viewport      | Surface      | Why                                        |
 * | ------------- | ------------ | ------------------------------------------ |
 * | >= 1760px     | Margin rail  | Real margin exists — use it, take no width |
 * | 1024-1759px   | Floating panel | No margin, so borrow width; content reflows |
 * | 640-1023px    | Capped sheet | Too narrow to push; a sheet, not stretched  |
 * | < 640px       | Full sheet   | A phone                                     |
 *
 * The rail is ALWAYS VISIBLE and needs no trigger — it costs nothing, so
 * hiding it behind a button would be a step for no reason. The other three
 * are opened by the Filters button.
 *
 * THE FLOATING PANEL IS NOT A MODAL, and that is the point. It has no scrim, no
 * focus trap and no close-on-outside-click, because it is meant to stay open
 * while you scroll the results and keep adjusting filters — every one of
 * those behaviours would fight exactly that. Only its own toggle closes it.
 * That is why it is not built on `Modal`: the shared shell is modal by
 * definition, and bending it into a non-modal surface would weaken it for the
 * cases that genuinely need trapping.
 *
 * The two sheet sizes DO use the shared `BottomSheet`, which is modal and
 * should be — on a phone the sheet covers the results anyway, so trapping
 * focus in it is correct.
 *
 * Only one surface mounts at a time, chosen by media query rather than CSS
 * `hidden`: two mounted copies would mean duplicate `useId()` values and two
 * tab stops for the same control.
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
  const hasRail = useMediaQuery(RAIL_QUERY);
  const canPush = useMediaQuery(PUSH_QUERY);
  const isPush = canPush && !hasRail;

  const close = () => setOpen(false);
  const body = <div className="flex flex-col gap-5">{filters}</div>;

  const clearLink = activeCount > 0 && onClearAll && (
    <button
      type="button"
      onClick={onClearAll}
      className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
    >
      {t("clear")}
    </button>
  );

  return (
    <div
      className="filter-section relative"
      /* Drives the push panel's content offset — see .filter-section in
         globals.css. Only meaningful in the push range. */
      data-panel-open={isPush && open ? "true" : "false"}
    >
      {/* ---- >= 1760px: the margin rail, always visible ---- */}
      {hasRail && (
        <div className="filter-rail-track pointer-events-none absolute bottom-0 top-0 w-56">
          <aside aria-label={heading} className="filter-rail-sticky sticky">
            <div className="pointer-events-auto flex flex-col gap-5 overflow-y-auto rounded-lg border-2 border-black02 bg-offwhite p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-sans text-heading-m font-bold text-black02">
                  {heading}
                </h2>
                {clearLink}
              </div>
              {body}
            </div>
          </aside>
        </div>
      )}

      {/* ---- 1024-1759px: the persistent floating panel ---- */}
      {isPush && open && (
        <div className="filter-float-track">
          <aside
            aria-label={heading}
            className="filter-float-panel anim-push-in"
          >
            <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
              <h2 className="font-sans text-heading-m font-bold text-black02">
                {heading}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="rounded-pill border-2 border-black02 p-1.5 text-black02 transition-colors hover:bg-primary"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
            {clearLink && <div className="mt-5 shrink-0">{clearLink}</div>}
          </aside>
        </div>
      )}

      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        {/* The rail needs no trigger — it is already on screen. */}
        {!hasRail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
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
        )}
        {toolbar}
      </div>

      {children}

      {/* ---- < 1024px: the shared bottom sheet, capped on tablet ---- */}
      {!hasRail && !isPush && (
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
              {activeCount > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="rounded-pill border-2 border-black02 px-5 py-3 font-sans text-body-m font-bold text-black02"
                >
                  {t("clear")}
                </button>
              )}
            </div>
          }
        >
          {body}
        </BottomSheet>
      )}
    </div>
  );
}
