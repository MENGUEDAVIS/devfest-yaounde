"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface CartLine {
  productId: string;
  quantity: number;
  variant?: { size?: string; color?: string };
}

const KEY = "devfest-cart";
/** The server caps a shop order at 20 lines of 10; stop at the same numbers. */
export const MAX_LINE_QTY = 10;
export const MAX_LINES = 20;

/**
 * The shopping bag.
 *
 * Held in `localStorage` and published through `useSyncExternalStore`, so the
 * bag survives navigation and reload, and every component reading it sees the
 * same value without prop-drilling or a provider.
 *
 * IT IS DEVICE-LOCAL. The backend has no cart — `POST /api/checkout/shop`
 * takes the whole basket in one request — so a bag started on a phone does
 * not appear on a laptop, and clearing site data empties it. That is a
 * documented limitation (GAPS.md), not an oversight, and it is why nothing in
 * the UI describes the bag as "saved to your account".
 *
 * Snapshots are cached: `useSyncExternalStore` compares by identity, so
 * parsing the JSON afresh on every call would loop forever.
 */
let cached: CartLine[] = [];
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode or blocked storage: the bag works for this page view only.
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed : [];
  } catch {
    cached = [];
  }
  return cached;
}

function write(next: CartLine[]) {
  cached = next;
  cachedRaw = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, cachedRaw);
  } catch {
    // Not fatal — the in-memory copy still drives this session.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab changing the bag should update this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cachedRaw = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

const sameVariant = (a: CartLine["variant"], b: CartLine["variant"]) =>
  (a?.size ?? "") === (b?.size ?? "") && (a?.color ?? "") === (b?.color ?? "");

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => []);

  const add = useCallback((line: CartLine) => {
    const current = read();
    const i = current.findIndex(
      (l) =>
        l.productId === line.productId && sameVariant(l.variant, line.variant),
    );
    if (i === -1) {
      if (current.length >= MAX_LINES) return;
      write([...current, line]);
      return;
    }
    // Same product AND same variant merges; a different size is its own line.
    const merged = [...current];
    merged[i] = {
      ...merged[i],
      quantity: Math.min(MAX_LINE_QTY, merged[i].quantity + line.quantity),
    };
    write(merged);
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    const current = read();
    if (quantity <= 0) {
      write(current.filter((_, i) => i !== index));
      return;
    }
    write(
      current.map((l, i) =>
        i === index ? { ...l, quantity: Math.min(MAX_LINE_QTY, quantity) } : l,
      ),
    );
  }, []);

  const remove = useCallback((index: number) => {
    write(read().filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return { lines, add, setQuantity, remove, clear, count };
}
