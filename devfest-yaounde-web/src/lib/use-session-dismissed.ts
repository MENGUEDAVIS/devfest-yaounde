"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a sessionStorage-backed "dismissed" flag via useSyncExternalStore —
 * the React-documented way to read an external, non-reactive browser API
 * (sessionStorage has no change events for same-document writes) without
 * a server/client hydration mismatch.
 */
const cache = new Map<string, boolean>();
const listeners = new Map<string, Set<() => void>>();

function getSnapshot(key: string) {
  if (!cache.has(key)) {
    cache.set(key, sessionStorage.getItem(key) === "1");
  }
  return cache.get(key)!;
}

function getServerSnapshot() {
  return false;
}

function subscribe(key: string, listener: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function useSessionDismissed(key: string): [boolean, () => void] {
  const dismissed = useSyncExternalStore(
    useCallback((listener) => subscribe(key, listener), [key]),
    () => getSnapshot(key),
    getServerSnapshot,
  );

  const dismiss = useCallback(() => {
    sessionStorage.setItem(key, "1");
    cache.set(key, true);
    notify(key);
  }, [key]);

  return [dismissed, dismiss];
}
