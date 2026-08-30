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
   * `takeover`: a TRUE full-screen surface. It covers the entire viewport
   * including the navbar, and carries no panel chrome of its own — the
   * content sits directly on a blurred scrim so nothing competes with it.
   * Used by the slider lockup.
   */
  variant?: ModalVariant;
  /**
   * Takeover only: also request the browser's Fullscreen API on open and
   * release it on close.
   *
   * This is best-effort by design. The request needs a live user activation
   * and can be refused outright (an iframe without `allow="fullscreen"`, a
   * browser policy, a user who said no), so a rejection is swallowed: the
   * in-app overlay already covers the viewport, and the experience degrades
   * to "full-screen within the tab" rather than breaking.
   *
   * Leaving fullscreen by any route the browser owns — Esc, F11, the OS —
   * closes the overlay too, so the two can never disagree about what the
   * user is looking at.
   */
  browserFullscreen?: boolean;
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
  browserFullscreen = false,
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

  // Browser fullscreen, kept in sync with the overlay in both directions.
  useEffect(() => {
    if (!open || !browserFullscreen) return;
    const root = document.documentElement;

    // Rejections are expected and harmless — see the prop's doc comment.
    root.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});

    function onFullscreenChange() {
      // The user left fullscreen through the browser (Esc, F11, the OS).
      // Close the overlay so the two never disagree.
      if (!document.fullscreenElement) onClose();
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement)
        document.exitFullscreen?.().catch(() => {});
    };
  }, [open, browserFullscreen, onClose]);

  if (!open) return null;

  const takeover = variant === "takeover";

  return createPortal(
    <div
      className={
        takeover
          ? // Covers EVERYTHING, navbar included. z-100 clears the chrome
            // (z-50) and the floating scrollbar (z-60); the custom cursor
            // stays above at 9999, which is correct — it must never be
            // occluded by what it is pointing at.
            "fixed inset-0 z-100 flex items-stretch justify-center p-4 sm:p-6"
          : "fixed inset-0 z-100 flex items-center justify-center p-4"
      }
    >
      <div
        aria-hidden
        onClick={onClose}
        className={`${modalBackdropIn} absolute inset-0 ${
          takeover
            ? // Blur is what pulls focus onto the content: the page behind
              // stays legible as context but stops competing for attention.
              // A flat scrim over a blur — no gradient (DESIGN.md §2.6).
              "bg-black02/80 backdrop-blur-md"
            : "bg-black02/50"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          takeover
            ? // NO panel chrome — no card, no border, no background. The
              // content sits straight on the blurred scrim and gets the
              // whole screen, which is the point of a takeover.
              `${modalPopIn} takeover-panel relative flex w-full max-w-[110rem] flex-col ${className}`
            : `${modalPopIn} relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-offwhite p-6 sm:p-8 ${className}`
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={
            takeover
              ? "absolute right-0 top-0 z-10 rounded-pill border-2 border-offwhite/40 bg-black02/60 p-2.5 text-offwhite transition-colors hover:border-offwhite hover:bg-offwhite hover:text-black02"
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
