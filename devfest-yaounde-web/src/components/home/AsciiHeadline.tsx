"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { toAsciiBanner } from "@/lib/ascii";

/** Type this anywhere on the page to flip the headline. */
const CODE = "ascii";
/** Hold the headline this long to flip it — the touch-friendly trigger. */
const HOLD_MS = 700;

/*
 * Trigger 3 (`#ascii` in the URL) reads a piece of BROWSER state, so it goes
 * through useSyncExternalStore rather than a setState in an effect. The hash
 * is never sent to the server, so the server snapshot is always false and the
 * client corrects after hydration — with no mismatch, because the store is
 * the thing React reconciles against. As a bonus this also picks up a hash
 * added later (a #ascii link clicked from within the page), which a one-shot
 * read on mount would have missed.
 */
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readHash() {
  return window.location.hash === `#${CODE}`;
}
function serverHash() {
  return false;
}

export interface AsciiHeadlineProps {
  /**
   * What the ASCII banner spells. Kept separate from `label` because the
   * 5-row font has no accented glyphs: banner-ing "Yaoundé" would either
   * misspell the city or leave a hole, so the banner spells the part that
   * renders cleanly while the accessible heading keeps the full name.
   */
  text: string;
  /** The full headline text, used as the accessible heading while flipped. */
  label: string;
  /** The real headline, shown until the egg fires. */
  children: ReactNode;
}

/**
 * Headline easter egg — PHASE10 §10.
 *
 * The headline flips to an ASCII-art rendering of itself, and flips back.
 * THREE different ways in, so it's findable by more than one kind of person
 * rather than being a single secret only its author knows:
 *
 *  1. Type `ascii` anywhere on the page (the classic).
 *  2. Press and hold the headline for 700ms — works on touch, where there is
 *     no keyboard to type into and no hover to discover.
 *  3. Land on the page with `#ascii` in the URL — so it can be shared.
 *
 * Escape, a click, or repeating any trigger flips it back.
 *
 * Accessibility: the ASCII block is `aria-hidden` and the real headline text
 * stays in the DOM as an `sr-only` heading, so the page's H1 never becomes a
 * wall of block characters for a screen reader. The egg is decorative and
 * never the only way to read the page.
 *
 * Reduced motion: the flip is a cut, not an animated morph — the CSS
 * transition on `.ascii-flip` is dropped under the media query.
 */
export function AsciiHeadline({ text, label, children }: AsciiHeadlineProps) {
  const t = useTranslations("home.hero");
  const hashOn = useSyncExternalStore(subscribeHash, readHash, serverHash);
  /*
   * `null` means "nobody has toggled it, follow the URL". Once someone acts,
   * their choice wins — otherwise dismissing the egg on a #ascii link would
   * be impossible, since the hash would keep forcing it back on.
   */
  const [manual, setManual] = useState<boolean | null>(null);
  const on = manual ?? hashOn;
  const holdTimer = useRef<number | null>(null);

  const toggle = useCallback(() => setManual((v) => !(v ?? hashOn)), [hashOn]);

  // Trigger 1 — typed code.
  useEffect(() => {
    let buffer = "";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setManual(false);
        return;
      }
      // Don't listen while someone is typing into a field — searching the
      // FAQ for "classic" shouldn't set off a headline easter egg.
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-CODE.length);
      if (buffer === CODE) {
        buffer = "";
        setManual((v) => !(v ?? readHash()));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Trigger 2 — press and hold.
  function startHold() {
    holdTimer.current = window.setTimeout(toggle, HOLD_MS);
  }
  function cancelHold() {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }
  useEffect(() => cancelHold, []);

  const banner = toAsciiBanner(text);

  return (
    <div
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className="ascii-host relative"
    >
      {on ? (
        <>
          {/* The real headline stays available to assistive tech. */}
          <h1 className="sr-only">{label}</h1>
          <pre
            aria-hidden
            onClick={toggle}
            className="ascii-flip cursor-pointer overflow-x-auto font-mono text-[clamp(0.3rem,1.35vw,0.85rem)] font-bold leading-[1.05] text-black02"
          >
            {banner}
          </pre>
          <button
            type="button"
            onClick={toggle}
            className="mt-4 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55 underline decoration-2 underline-offset-4 hover:text-black02"
          >
            {t("asciiExit")}
          </button>
        </>
      ) : (
        <div className="ascii-flip">{children}</div>
      )}
    </div>
  );
}
