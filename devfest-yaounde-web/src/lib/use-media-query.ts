"use client";

import { useSyncExternalStore } from "react";

/**
 * Read a CSS media query from React, live.
 *
 * `useSyncExternalStore` rather than an effect + setState: a media query is
 * exactly the "external, non-reactive browser state" React documents this
 * hook for, and it keeps the read out of the render path. It also gives a
 * defined SERVER value instead of a first-render guess that would have to be
 * corrected — which is what causes hydration mismatches in the usual
 * `useState(window.matchMedia(...))` version of this.
 *
 * The server snapshot is `false` by design: components using this must render
 * something sensible when the query does not match, because that is what the
 * server sends and what the client hydrates before correcting. For the
 * mobile-vs-desktop split this means desktop is the SSR shape.
 *
 * Snapshots are cached per query so repeated calls return a stable boolean —
 * returning a fresh value each call would loop.
 */
const cache = new Map<string, boolean>();

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      const handler = () => {
        cache.set(query, mq.matches);
        onChange();
      };
      cache.set(query, mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
    () => {
      if (!cache.has(query)) cache.set(query, window.matchMedia(query).matches);
      return cache.get(query)!;
    },
    () => false,
  );
}

/** Tailwind's `md` breakpoint. Below this, no slider and no side popovers. */
export const MOBILE_QUERY = "(max-width: 767px)";
