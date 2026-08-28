"use client";

import { useEffect, useState } from "react";
import { navSettle } from "@/lib/motion";
import { useSessionDismissed } from "@/lib/use-session-dismissed";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { Navbar } from "./Navbar";

const DISMISS_KEY = "devfest-announcement-dismissed";

/**
 * DESIGN.md §7c: the announcement banner and the navbar are ONE connected
 * component — identical width, identical horizontal alignment, banner
 * attached directly to the top of the nav (the Claude.ai credit-notice
 * model). They must never read as two mismatched floating bars.
 *
 * The "more interesting than a plain pill" behaviour (§7c) is a real shape
 * morph: with the banner open the unit is a large rounded rectangle
 * (radius-lg); once the banner is dismissed or the page is scrolled, the
 * unit morphs into a full pill and tightens. Dismissal animates the banner
 * height to zero via the grid-template-rows 1fr->0fr technique, so the nav
 * smoothly reclaims the space instead of hard-jumping.
 */
export function GlobalChrome() {
  const [dismissed, dismiss] = useSessionDismissed(DISMISS_KEY);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const bannerOpen = !dismissed;
  /*
   * The shape morph is driven by the banner, not by scroll: with the banner
   * attached the unit is a tall card (radius-lg), and dismissing it morphs
   * the whole thing down into a single pill as the nav reclaims the space.
   * Keying this off scroll instead over-rounds the tall two-row box.
   */
  const pillShape = !bannerOpen;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-6 sm:pt-5">
      <div
        className={`${navSettle} pointer-events-auto w-full max-w-4xl overflow-hidden border-2 border-black02 bg-offwhite transition-[border-radius,box-shadow,transform] duration-500 ease-bouncy ${
          pillShape ? "rounded-pill" : "rounded-lg"
        } ${
          scrolled
            ? "shadow-[0_6px_0_0_var(--color-black02)]"
            : "shadow-[0_3px_0_0_var(--color-black02)]"
        }`}
      >
        {/*
          grid-template-rows 1fr -> 0fr is the reliable way to animate an
          auto-height element to zero; the inner wrapper needs min-h-0 and
          overflow-hidden for it to actually clip.
        */}
        <div
          className="grid transition-[grid-template-rows] duration-400 ease-out-devfest motion-reduce:transition-none"
          style={{ gridTemplateRows: bannerOpen ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <AnnouncementBanner onDismiss={dismiss} hidden={!bannerOpen} />
          </div>
        </div>

        <Navbar compact={scrolled} />
      </div>
    </div>
  );
}
