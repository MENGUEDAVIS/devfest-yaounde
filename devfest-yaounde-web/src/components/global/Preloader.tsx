"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { useScramble } from "@/lib/use-scramble";
import { lockScroll } from "@/lib/scroll-source";
import { PreloaderDots } from "./PreloaderDots";

const WORDMARK = "DevFest Yaoundé";

/**
 * How long the screen is held.
 *
 * Long enough that the decode is actually seen, short enough that nobody is
 * kept waiting for a decoration. The hold starts at mount rather than at
 * "app ready", because by the time this component runs the app IS ready —
 * there is nothing left to wait for, and pretending otherwise would be a
 * progress bar for a load that already finished.
 */
const HOLD_MS = 1300;
const FADE_MS = 320;

/**
 * The branded loading screen.
 *
 * SERVER-RENDERED, deliberately. It is in the first HTML, so it covers the
 * page from the very first paint instead of flashing the site and then
 * hiding it. The theme wash comes from `bg-pastel`, which the theme script in
 * <head> has already resolved by then — the saved theme is honoured with no
 * work of its own.
 *
 * FIRST LOAD ONLY, and that falls out of where it lives: it is mounted by the
 * root layout, which does not remount on client navigation. Moving between
 * pages never shows it again; a genuine reload does.
 *
 * ACCESSIBILITY: the whole overlay is `aria-hidden` and holds nothing
 * focusable, so a screen reader walks straight past it to the real page and a
 * keyboard user is never trapped behind it. Focus is deliberately NOT
 * trapped. The wordmark is decorative here — the page's own <h1> is the
 * heading assistive tech should meet.
 */
export function Preloader() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /* Read, not stored. A setState for this in the effect body is exactly what
     `react-hooks/set-state-in-effect` refuses, and a media query is the
     "external, non-reactive browser state" useSyncExternalStore exists for —
     which is what `useMediaQuery` is. */
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { ref, start } = useScramble<SVGTextElement>({
    text: WORDMARK,
    loop: true,
  });

  /*
   * The lock has to be taken while the splash is up, and released the moment
   * it goes.
   *
   * KEYED ON `gone`, not on unmount, and that distinction was a real bug: a
   * component that returns null is still MOUNTED, so an effect keyed on
   * unmount never re-runs its cleanup — `lockScroll()`'s inline
   * `overflow: hidden` would have stayed on <html> and <body> forever, and
   * the page would have been permanently unscrollable after the splash.
   *
   * The CSS `:has([data-preloader])` rule covers the paint-to-hydration
   * window, before this effect has even run; this effect covers everything
   * after hydration, for as long as the component is mounted.
   */
  useEffect(() => {
    if (gone) return;
    return lockScroll();
  }, [gone]);

  useEffect(() => {
    start();
    const toFade = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const toGone = window.setTimeout(
      () => setGone(true),
      HOLD_MS + (calm ? 0 : FADE_MS),
    );
    return () => {
      window.clearTimeout(toFade);
      window.clearTimeout(toGone);
    };
  }, [start, calm]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      /*
        The value is the handoff signal, not just a marker.

        `held` means the splash still owns the screen; `leaving` means it is
        fading and the page underneath should start arriving. motion.css
        pauses the hero's entrance while a held preloader is in the document,
        so the sequence plays AS the splash lifts instead of finishing behind
        it — which is what used to happen, since the animations started at
        first paint and were long over by the time anyone saw the page.

        Keyed off the element's presence rather than a class on <html>, so it
        fails in the safe direction: no preloader in the DOM (a page without
        one, or JS that never hydrated after the element was removed) means
        nothing is paused and the hero simply animates.
      */
      data-preloader={leaving ? "leaving" : "held"}
      /* Above the chrome, the overlays and the floating scrollbar; below the
         custom cursor, which must never be occluded by what it points at. */
      className={`fixed inset-0 z-[9000] flex items-center justify-center overflow-hidden bg-pastel transition-opacity motion-reduce:transition-none ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <PreloaderDots calm={calm} />

      {/*
        SVG, and `textLength` is the reason.

        The line has to fill ~80% of the viewport on one line, and a scramble
        swaps every glyph several times a second. In HTML with a proportional
        display face that means the whole wordmark twitching wider and
        narrower at 60fps — unmissable at this size. `textLength` with
        `lengthAdjust="spacing"` pins the width and lets the letter-spacing
        absorb the difference, so the glyphs keep their shape and the line
        never moves. It also scales to any viewport for free.
      */}
      <svg
        viewBox="0 0 100 18"
        className="relative w-[80vw] max-w-[1600px]"
        role="presentation"
      >
        <text
          ref={ref}
          x="50"
          y="13.5"
          textLength="98"
          lengthAdjust="spacing"
          textAnchor="middle"
          fill="#1E1E1E"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {WORDMARK}
        </text>
      </svg>
    </div>
  );
}
