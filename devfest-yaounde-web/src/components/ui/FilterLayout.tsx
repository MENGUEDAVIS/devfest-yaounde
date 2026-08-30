"use client";

import { FunnelSimple, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface FilterLayoutProps {
  /** The filter groups (and search) — rendered in the sidebar and the drawer. */
  filters: ReactNode;
  /** How many filters are currently active — drives the mobile badge. */
  activeCount?: number;
  onClearAll?: () => void;
  /**
   * Heading for the rail and drawer. Defaults to "Filters"; /faqs overrides
   * it because its rail is a search + jump nav, not a filter set.
   */
  title?: string;
  /** Optional controls pinned above the content, e.g. a view toggle. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * The shared filtered-page layout — PHASE9 §2. Used by /speakers, /schedule,
 * /team and /faqs so there is ONE implementation rather than four bespoke
 * ones.
 *
 * Wide desktop: filters live in a rail that floats in the MARGIN beside the
 * content, taking no width from it — the content column is exactly as wide
 * and as centred as it would be with no filters at all (PHASE10 §1). The rail
 * is sticky within this section, so it stays put while you read but stops at
 * the section's end rather than covering the footer (PHASE11 §3).
 *
 * Narrower: the rail collapses into a bottom drawer opened by a Filters
 * button, which keeps vertical space for content. The drawer is focus
 * trapped, closes on Escape / scrim tap / close button / swipe-down, and
 * locks body scroll while open.
 *
 * The `filters` node is rendered in both the rail and the drawer, but
 * never both *visible*: the rail is hidden below 1760px and the drawer is
 * hidden above it and only mounted while open. Elements hidden with
 * `display: none` are dropped from the accessibility tree, so screen readers
 * never encounter two copies. Rendering the same element in two places also
 * creates two component instances, so `useId()` inside FilterGroup yields
 * distinct ids rather than colliding.
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<number | null>(null);

  // Focus trap + Escape + scroll lock while the drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const panel = panelRef.current;
    // Snapshot the opener now: by cleanup time the ref may point elsewhere,
    // and we want to restore focus to the button that actually opened this.
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="filter-section relative">
      {/* ---- Desktop: rail floating in the margin, outside the flow ---- */}
      {/*
        PHASE11 §3 — the rail is now STICKY WITHIN THIS SECTION, not fixed to
        the viewport.

        Before, it was `position: fixed`, which meant it never yielded to
        anything: scroll to the end of /schedule and it sat on top of the
        footer. Now `.filter-rail-track` is an absolutely-positioned column
        spanning exactly this section's height, and the rail is `sticky`
        inside it. Sticky is bounded by its containing block, so when the
        section ends the rail stops with it and the footer pushes it up —
        with no scroll listener and nothing to keep in sync.

        The track sits one 1.5rem gutter to the LEFT of the content column
        (`right: calc(100% + 1.5rem)`), measured from the column itself
        rather than from the viewport centre — the same result as the old
        `50vw - 53.5rem` arithmetic, but it no longer has to know the
        column's width.

        The 1760px breakpoint stays: the rail needs its own 1.5rem gutter
        from the screen edge, so it only fits once
        `50vw - 38rem (half the column) - 1.5rem - 14rem >= 1.5rem`,
        i.e. from 110rem = 1760px up. Below that there is genuinely no margin
        to float in — and since the content column must NOT narrow to make
        room (the whole point of the PHASE10 rework), narrower viewports get
        the drawer instead of a rail sitting on top of the content.
      */}
      <div className="filter-rail-track pointer-events-none absolute bottom-0 top-0 hidden w-56 min-[1760px]:block">
        <aside aria-label={heading} className="filter-rail-sticky sticky">
          <div className="pointer-events-auto flex flex-col gap-5 overflow-y-auto rounded-lg border-2 border-black02 bg-offwhite p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans text-heading-m font-bold text-black02">
                {heading}
              </h2>
              {activeCount > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 hover:text-black02/60"
                >
                  {t("clear")}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-5">{filters}</div>
          </div>
        </aside>
      </div>

      {/* ---- Main content: full width, centred, untouched by the rail ---- */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <button
          ref={openerRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none min-[1760px]:hidden"
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

      {/* ---- Narrow viewports: bottom drawer ---- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-100 min-[1760px]:hidden">
          <div
            aria-hidden
            onClick={() => setDrawerOpen(false)}
            className="anim-modal-backdrop absolute inset-0 bg-black02/50"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={heading}
            onPointerDown={(e) => {
              dragStart.current = e.clientY;
            }}
            onPointerUp={(e) => {
              // Swipe down to dismiss
              if (
                dragStart.current !== null &&
                e.clientY - dragStart.current > 70
              ) {
                setDrawerOpen(false);
              }
              dragStart.current = null;
            }}
            className="anim-drawer-up absolute inset-x-0 bottom-0 max-h-[82svh] overflow-y-auto rounded-t-lg border-t-4 border-black02 bg-offwhite px-6 pb-8 pt-4"
          >
            {/* Grab handle — also the swipe affordance */}
            <div
              aria-hidden
              className="mx-auto mb-5 h-1.5 w-12 rounded-pill bg-black02/25"
            />
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="font-sans text-heading-l font-bold text-black02">
                {heading}
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("close")}
                className="rounded-pill border-2 border-black02 p-1.5 text-black02 transition-colors hover:bg-primary"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-5">{filters}</div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
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
          </div>
        </div>
      )}
    </div>
  );
}
