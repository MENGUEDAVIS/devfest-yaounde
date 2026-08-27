"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { modalBackdropIn, modalPopIn } from "@/lib/motion";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible name for the dialog — falls back to an auto-generated id if omitted. */
  labelledBy?: string;
  className?: string;
  /** Localize this — the shell has no translation context of its own. */
  closeLabel?: string;
}

/**
 * Generic modal shell: portal, focus trap, escape-to-close, backdrop-click
 * close, body scroll lock. DESIGN.md/PAGES.md §4.2 asks for a shared-element
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
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const titleId = labelledBy ?? generatedId;

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current =
      document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = previousOverflow;
      previousActiveElement.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
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
        className={`${modalPopIn} relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-offwhite p-6 sm:p-8 ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-4 top-4 rounded-pill p-1.5 text-black02 transition-colors hover:bg-black02/10"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
