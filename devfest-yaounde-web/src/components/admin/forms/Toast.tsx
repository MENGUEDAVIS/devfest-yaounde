"use client";

import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export type ToastTone = "ok" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  /** Show a message. Returns nothing — a toast is never awaited. */
  push: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * The one place the admin says "that worked" or "that did not".
 *
 * Before this, every view kept its own `notice` and `error` string and
 * rendered them slightly differently. That was survivable when a view did one
 * thing; the CRM does five kinds of write from two places each, and the DP
 * wall needs to report a failure on a card the eye is already somewhere else
 * from. A toast goes where the eye is.
 *
 * Errors STAY until dismissed. A save that silently failed and then quietly
 * disappeared is the worst outcome available — worse than an error that
 * nags — so only successes time out.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, tone, message }]);
    if (tone === "ok") {
      window.setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        4000,
      );
    }
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {/*
        `aria-live="polite"` rather than assertive: these confirm something the
        person just did, so they should be announced at the next natural pause
        rather than cutting across whatever is being read.
      */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-80 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-body-m shadow-[0_4px_0_0_var(--color-black02)] ${
              toast.tone === "ok"
                ? "border-black02/20 bg-offwhite text-black02"
                : "border-danger/40 bg-danger-pastel text-black02"
            }`}
          >
            {toast.tone === "ok" ? (
              <CheckCircle
                size={18}
                weight="fill"
                aria-hidden
                className="mt-0.5 shrink-0 text-success"
              />
            ) : (
              <WarningCircle
                size={18}
                weight="fill"
                aria-hidden
                className="mt-0.5 shrink-0 text-danger"
              />
            )}
            <span className="min-w-0 flex-1 font-bold">{toast.message}</span>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              aria-label="Dismiss"
              className="shrink-0 rounded-pill p-0.5 text-black02/60 hover:bg-black02/10 hover:text-black02"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Never throws when there is no provider.
 *
 * A view rendered outside the shell (a test, a future standalone page) should
 * not crash because nothing is listening for its confirmations.
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { push: () => {} };
}
