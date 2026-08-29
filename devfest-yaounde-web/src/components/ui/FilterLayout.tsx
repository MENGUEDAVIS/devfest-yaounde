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
  /** Optional controls pinned above the content, e.g. a view toggle. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * The shared filtered-page layout — PHASE9 §2. Used by /speakers, /schedule
 * and /team so there is ONE implementation rather than three bespoke ones.
 *
 * Desktop: filters live in a STICKY side column, so the main content stays
 * centred in its own column and the controls never scroll away.
 *
 * Mobile: the sidebar collapses into a bottom drawer opened by a Filters
 * button, which keeps vertical space for content. The drawer is focus
 * trapped, closes on Escape / scrim tap / close button / swipe-down, and
 * locks body scroll while open.
 *
 * The `filters` node is rendered in both the sidebar and the drawer, but
 * never both *visible*: the sidebar is `hidden lg:block` and the drawer is
 * `lg:hidden` and only mounted while open. Elements hidden with
 * `display: none` are dropped from the accessibility tree, so screen readers
 * never encounter two copies. Rendering the same element in two places also
 * creates two component instances, so `useId()` inside FilterGroup yields
 * distinct ids rather than colliding.
 */
export function FilterLayout({
  filters,
  activeCount = 0,
  onClearAll,
  toolbar,
  children,
}: FilterLayoutProps) {
  const t = useTranslations("common.filters");
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
    <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-14">
      {/* ---- Desktop: sticky sidebar ---- */}
      <aside className="hidden lg:block">
        <div className="sticky top-36 flex flex-col gap-5 rounded-lg border-2 border-black02 bg-offwhite p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-heading-m font-bold text-black02">
              {t("title")}
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

      {/* ---- Main content column ---- */}
      <div className="min-w-0">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          {/* Mobile opener */}
          <button
            ref={openerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none lg:hidden"
          >
            <FunnelSimple size={18} weight="bold" aria-hidden />
            {t("open")}
            {activeCount > 0 && (
              <span className="rounded-pill bg-yellow px-2 py-0.5 font-mono text-mono-tag">
                {activeCount}
              </span>
            )}
          </button>
          {toolbar}
        </div>

        {children}
      </div>

      {/* ---- Mobile: bottom drawer ---- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <div
            aria-hidden
            onClick={() => setDrawerOpen(false)}
            className="anim-modal-backdrop absolute inset-0 bg-black02/50"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
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
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("close")}
                className="rounded-pill border-2 border-black02 p-1.5 text-black02 transition-colors hover:bg-yellow"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-5">{filters}</div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 rounded-pill border-2 border-black02 bg-yellow px-6 py-3 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
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
