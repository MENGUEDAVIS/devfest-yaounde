"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * The public "N tickets remaining" banner (Phase 20 / A6).
 *
 * `total` is the admin-set overall event capacity — independent of any
 * tier's own cap, which checkout enforces separately. Nothing renders when
 * `total` is null: no capacity has been set, so there is nothing honest to
 * show. `remaining` comes from the server, polled on an interval; this
 * component never computes it from tier data itself.
 *
 * The digits roll like a view counter on change (`Odometer` below). Not a
 * new dependency — a fixed-height column of "0123456789" per digit,
 * translated with a CSS transition. `prefers-reduced-motion` skips the
 * transition entirely, per DESIGN.md §6.5.
 */
const POLL_MS = 60_000;

export function CapacityCounter({
  initial,
}: {
  initial: { total: number | null; remaining: number | null };
}) {
  const t = useTranslations("pages.tickets");
  const locale = useLocale();
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (initial.total == null) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      fetch("/api/tickets/capacity")
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { total: number | null; remaining: number | null } | null) => {
          if (!cancelled && body) setState(body);
        })
        .catch(() => {
          // A stale number beats a broken banner — just skip this tick.
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.total]);

  if (state.total == null || state.remaining == null) return null;

  const digits = Math.max(String(state.total).length, 2);

  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-black02 bg-pastel px-5 py-3.5">
      <Odometer value={state.remaining} digits={digits} />
      <span className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70">
        {t("capacityRemaining", { total: state.total.toLocaleString(locale) })}
      </span>
    </div>
  );
}

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/**
 * `useSyncExternalStore` rather than an effect + `setState`: this reads
 * genuinely external state (the OS/browser motion preference), and the hook
 * exists specifically to do that without a mount-time render cascade or a
 * server/client mismatch — the SSR snapshot is `false` (no window), and the
 * real value takes over on the client's first paint.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function Odometer({ value, digits }: { value: number; digits: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const padded = Math.max(0, value).toString().padStart(digits, "0");

  return (
    <span
      className="flex font-mono text-heading-m font-bold tabular-nums text-black02"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">{value}</span>
      {/*
        No mount-vs-later distinction needed: a CSS transition never animates
        the value an element is FIRST painted with, only a change from one
        already-rendered value to the next — so the roll only ever shows up
        on a real update (a poll, or an admin edit), never on page load.
      */}
      <span aria-hidden className="flex overflow-hidden">
        {padded.split("").map((digit, i) => (
          <span
            key={i}
            className="relative h-[1em] w-[0.62em] overflow-hidden"
          >
            <span
              className={`absolute inset-x-0 top-0 flex flex-col ${
                reduceMotion
                  ? ""
                  : "transition-transform duration-500 ease-out"
              }`}
              style={{
                transform: `translateY(-${Number(digit) * 1}em)`,
              }}
            >
              {"0123456789".split("").map((d) => (
                <span key={d} className="flex h-[1em] items-center justify-center">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
