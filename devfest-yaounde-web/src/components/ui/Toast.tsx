"use client";

import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { fadeInUp } from "@/lib/motion";

/**
 * A short, dismissible notice. Reduced-motion is on the preset: fadeInUp
 * no-ops under prefers-reduced-motion.
 */
export function Toast({
  children,
  onDismiss,
  dismissLabel,
}: {
  children: ReactNode;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  return (
    <div
      role="status"
      className={`${fadeInUp} fixed bottom-6 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-lg border-2 border-black02 bg-offwhite px-4 py-3 shadow-[0_4px_0_0_var(--color-black02)]`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 text-body-m font-bold text-black02">
          {children}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-pill border-2 border-black02 p-1 hover:bg-primary"
        >
          <X size={14} weight="bold" aria-hidden />
        </button>
      </div>
    </div>
  );
}
