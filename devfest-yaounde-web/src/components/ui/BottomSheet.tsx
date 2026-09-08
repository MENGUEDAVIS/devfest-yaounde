"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { lockScroll } from "@/lib/scroll-source";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Past this much downward drag, releasing dismisses the sheet. */
const SWIPE_DISMISS_PX = 70;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. Always used by assistive tech. */
  title: string;
  /**
   * Optional visual to show in the header INSTEAD of the title text.
   *
   * Card details use this for a circle avatar: the body already leads with
   * the person's name, so printing it in the header too said it twice. The
   * avatar identifies whose sheet this is without the repetition, and
   * `title` still carries the name to screen readers.
   */
  titleVisual?: ReactNode;
  closeLabel: string;
  /** Rendered under the heading. */
  children: ReactNode;
  /** Pinned to the bottom of the sheet, below the scrollable body. */
  footer?: ReactNode;
  className?: string;
}

/**
 * The shared bottom sheet — extracted from `FilterLayout` in PHASE13 §5.
 *
 * It was built inline there for the mobile filter drawer (PHASE9 §2). When
 * mobile card details needed the same treatment, the choice was to extract
 * this or write a second sheet; extracting keeps ONE focus trap, one scroll
 * lock and one dismissal contract to keep correct. Both the filter drawer
 * and the person-card detail now render through this.
 *
 * Dismissal, four ways, because a sheet that is hard to close is worse than
 * no sheet: the close button, Escape, tapping the scrim, and swiping down.
 *
 * Scroll lock routes through `lockScroll`, which also stops Lenis — plain
 * `overflow: hidden` does not, so the page would keep gliding underneath.
 *
 * Portalled to <body> so no ancestor's `overflow` or stacking context can
 * clip it. That matters here specifically: the person cards it now serves
 * live inside grids and transformed `Reveal` wrappers.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  titleVisual,
  closeLabel,
  children,
  footer,
  className = "",
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    // Snapshot now: by cleanup time the active element may be gone, and we
    // want focus back on whatever actually opened this.
    previousActive.current = document.activeElement as HTMLElement | null;
    const releaseScroll = lockScroll();
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
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
      releaseScroll();
      previousActive.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    /* `data-lenis-prevent` for the same reason as `Modal` — a stopped Lenis
       still preventDefaults wheel events, which would freeze the sheet's own
       scrolling body along with the page. */
    <div data-lenis-prevent className="fixed inset-0 z-100">
      <div
        aria-hidden
        /*
         * Dismiss on POINTERDOWN, with the default prevented — not on click.
         *
         * On a touch screen the sequence is pointerdown → pointerup → a
         * compatibility `click`. Closing on `click` unmounted this portal
         * mid-sequence, and the browser then delivered the tail of that same
         * tap to whatever was newly underneath — so tapping outside a
         * speaker's sheet closed it AND opened the sheet of the card behind
         * the tap. Two sheets from one finger.
         *
         * `preventDefault()` on pointerdown suppresses the compatibility
         * mouse events for the whole gesture, so the tap ends where it began:
         * on the scrim. `stopPropagation` keeps it off anything above.
         */
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        // A pointer that started elsewhere and is released here must not
        // reach the page either.
        onClick={(event) => event.stopPropagation()}
        // Blurred scrim, matching the full-screen lockup: the page behind
        // stays as context but stops competing with the sheet.
        className="anim-modal-backdrop absolute inset-0 bg-black02/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => {
          dragStart.current = e.clientY;
        }}
        onPointerUp={(e) => {
          if (
            dragStart.current !== null &&
            e.clientY - dragStart.current > SWIPE_DISMISS_PX
          ) {
            onClose();
          }
          dragStart.current = null;
        }}
        /*
         * PHASE14 §1: width-capped and centred from `sm` up. A sheet stretched
         * across a tablet reads as a broken phone layout — Material's
         * large-screen dialog behaviour is to cap and centre it. Mobile keeps
         * the full-width sheet, which is right on a phone. The side corners
         * are rounded once it is no longer flush to the edges.
         */
        className={`anim-drawer-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[85svh] flex-col rounded-t-lg border-t-4 border-black02 bg-offwhite px-6 pb-8 pt-4 sm:max-w-xl sm:rounded-t-xl sm:border-x-2 ${className}`}
      >
        {/* Grab handle — also the swipe affordance */}
        <div
          aria-hidden
          className="mx-auto mb-5 h-1.5 w-12 shrink-0 rounded-pill bg-black02/25"
        />
        <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
          {titleVisual ?? (
            <h2 className="font-sans text-heading-l font-bold text-black02">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-pill border-2 border-black02 p-1.5 text-black02 transition-colors hover:bg-primary"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Only the body scrolls, so the handle, heading and footer stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="mt-8 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
