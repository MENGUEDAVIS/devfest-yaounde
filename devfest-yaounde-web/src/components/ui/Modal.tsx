"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { modalBackdropIn, modalPopIn } from "@/lib/motion";
import { lockScroll } from "@/lib/scroll-source";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalVariant = "dialog" | "takeover";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible name for the dialog — falls back to an auto-generated id if omitted. */
  labelledBy?: string;
  className?: string;
  /** Localize this — the shell has no translation context of its own. */
  closeLabel?: string;
  /**
   * `dialog` (default): a centred, max-width panel — the classic modal.
   *
   * `takeover` (PHASE13 §2): a full-page locked surface that fills the
   * viewport BELOW the fixed chrome, which stays visible on top. Used by the
   * slider lockup. It sits at z-40 — under the chrome's z-50 — which is what
   * keeps the navbar above it; the default dialog stays at z-100 and covers
   * everything, as a dialog should.
   */
  variant?: ModalVariant;
}

/**
 * Generic overlay shell: portal, focus trap, escape-to-close, backdrop-click
 * close, body scroll lock.
 *
 * PHASE13 §2 extended this with a `takeover` variant rather than building a
 * second overlay system for the slider lockup. Everything the lockup needs —
 * portal, focus trap, Escape, backdrop dismiss, scroll lock, focus
 * restoration — already lived here and was otherwise unused; duplicating it
 * would have meant two focus traps to keep correct instead of one.
 * DESIGN.md/PAGES.md §4.2 asks for a shared-element
 * "grows from the clicked card" transition — this shell instead uses a
 * centered scale+fade (DESIGN.md §6.1 maps "modal open" to ease-out, meso
 * tier), which is the honest scope for a *generic* shell with no knowledge
 * of any specific trigger card. A true shared-element/FLIP transition needs
 * either an origin rect wired in by the caller or an animation library
 * (flagged, not installed) — worth revisiting once the Speaker Modal
 * (Phase 4) has a real card to originate from. See docs/components/modal.md.
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className = "",
  closeLabel = "Close",
  variant = "dialog",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const titleId = labelledBy ?? generatedId;

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current =
      document.activeElement as HTMLElement | null;
    // Routed through the scroll seam: `overflow: hidden` alone does not stop
    // Lenis, which runs its own loop against the real document, so the page
    // would keep gliding behind a "locked" overlay.
    const releaseScroll = lockScroll();

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      releaseScroll();
      previousActiveElement.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const takeover = variant === "takeover";

  return createPortal(
    <div
      className={
        takeover
          ? // Below the chrome's z-50, and starting below it, so the navbar
            // stays visible and clickable above the lockup.
            "fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-center px-4 pb-4 sm:px-6 sm:pb-6"
          : "fixed inset-0 z-100 flex items-center justify-center p-4"
      }
      style={takeover ? { top: "var(--chrome-h)" } : undefined}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`${modalBackdropIn} absolute inset-0 bg-black02/50`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          takeover
            ? `${modalPopIn} takeover-panel relative flex w-full max-w-7xl flex-col overflow-hidden rounded-lg border-2 border-black02 bg-offwhite p-5 shadow-[0_8px_0_0_var(--color-black02)] sm:p-7 ${className}`
            : `${modalPopIn} relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-offwhite p-6 sm:p-8 ${className}`
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={
            takeover
              ? "absolute right-4 top-4 z-10 rounded-pill border-2 border-black02 bg-offwhite p-2 text-black02 transition-colors hover:bg-primary"
              : "absolute right-4 top-4 rounded-pill p-1.5 text-black02 transition-colors hover:bg-black02/10"
          }
        >
          <X size={20} weight={takeover ? "bold" : "regular"} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
