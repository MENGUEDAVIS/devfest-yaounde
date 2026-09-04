"use client";

import { List, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Link, usePathname } from "@/i18n/navigation";
import { ConfettiBurst } from "./ConfettiBurst";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_LINKS = [
  { href: "/schedule", key: "schedule" },
  { href: "/speakers", key: "speakers" },
  { href: "/faqs", key: "faqs" },
  { href: "/team", key: "team" },
] as const;

const CONFETTI_CLICK_THRESHOLD = 6;
const CONFETTI_CLICK_WINDOW_MS = 1500;
const CONFETTI_DURATION_MS = 1000;

/**
 * The nav row of the connected chrome unit (DESIGN.md §7c). Width and
 * alignment come from GlobalChrome — this sets no max-width of its own.
 *
 * Overlap fix: the full desktop row (logo + 4 links + switcher + 2 CTAs)
 * genuinely does not fit at the old `md` (768px) breakpoint, which is what
 * caused logo/link collisions. The hamburger now persists until `lg`
 * (1024px), where there is real room for everything.
 */
export function Navbar({ compact }: { compact: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const clickTimestamps = useRef<number[]>([]);

  /**
   * A full-screen panel has two obligations an inline accordion never had:
   * the page behind it must not scroll, and Escape must close it. Without
   * the scroll lock, dragging on the panel scrolls the article underneath
   * it — which on a phone reads as the menu being broken.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function handleLogoClick() {
    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current, now].filter(
      (ts) => now - ts < CONFETTI_CLICK_WINDOW_MS,
    );
    if (clickTimestamps.current.length >= CONFETTI_CLICK_THRESHOLD) {
      clickTimestamps.current = [];
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
    }
  }

  return (
    <nav
      className={`px-4 transition-[padding] duration-300 ease-out-devfest sm:px-5 ${
        compact ? "py-2" : "py-3 sm:py-3.5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/*
          PHASE10 §10: the logo is a real link home, which is where every
          visitor expects a site logo to go — as a <button> it was a
          dead end on every inner page. The confetti easter egg rides along
          on the same click handler: repeated clicks still count, and on
          the home page they navigate nowhere, so the egg is unaffected.
        */}
        <Link
          href="/"
          onClick={handleLogoClick}
          aria-label={t("home")}
          className="logo-interactive relative flex shrink-0 items-center gap-2.5 whitespace-nowrap py-1.5 font-sans text-heading-m font-bold text-black02 transition-transform duration-200 ease-bouncy hover:scale-105"
        >
          <DevFestLogo className="h-6 w-auto shrink-0" />
          DevFest Yaoundé
          {showConfetti && <ConfettiBurst />}
        </Link>

        <div className="hidden min-w-0 items-center gap-4 lg:flex xl:gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap py-1 font-sans text-body-m font-bold transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-1 after:origin-left after:rounded-pill after:bg-primary after:transition-transform after:duration-300 after:ease-out-devfest hover:text-black02 ${
                  isActive
                    ? "text-black02 after:scale-x-100"
                    : "text-black02/70 after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <Link
            href="/shop"
            className="whitespace-nowrap rounded-pill border-2 border-black02 px-4 py-2 font-sans text-body-m font-bold text-black02 transition-[background-color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-pastel active:translate-y-0.5"
          >
            {t("shop")}
          </Link>
          <Link
            href="/tickets"
            className="whitespace-nowrap rounded-pill border-2 border-black02 bg-primary px-4 py-2 font-sans text-body-m font-bold text-black02 shadow-[0_3px_0_0_var(--color-black02)] transition-[transform,box-shadow,background-color] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-halftone hover:shadow-[0_5px_0_0_var(--color-black02)] active:translate-y-0.5 active:shadow-none"
          >
            {t("tickets")}
          </Link>
        </div>

        <button
          type="button"
          className="-mr-1.5 shrink-0 rounded-pill p-3 transition-transform duration-200 ease-bouncy hover:scale-110 active:scale-90 lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <List size={24} weight="bold" />
          )}
        </button>
      </div>

      {/*
        A full-screen drawer, not a strip that unfolds under the bar.
        
        It used to be a `grid-template-rows` accordion inside the nav: the
        menu opened into the top of the page and left the article showing
        beneath it, so on a phone it read as something stuck at the top
        rather than as a menu. Full-bleed gives the links room to be tap
        targets and makes it unambiguous that the site is waiting.
      */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("openMenu")}
        hidden={!mobileOpen}
        className="fixed inset-0 z-[60] flex flex-col bg-offwhite lg:hidden"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <DevFestLogo className="h-7 w-auto" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("closeMenu")}
            className="rounded-pill border-2 border-black02 p-2.5 text-black02 transition-transform duration-200 active:scale-90"
          >
            <X size={22} weight="bold" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-8 pt-4">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-4 py-4 font-sans text-heading-m font-bold transition-colors duration-200 ${
                  isActive
                    ? "border-2 border-black02 bg-primary text-black02"
                    : "border-2 border-transparent text-black02/80 hover:bg-pastel hover:text-black02"
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Link
              href="/tickets"
              onClick={() => setMobileOpen(false)}
              className="rounded-pill border-2 border-black02 bg-primary px-5 py-3.5 text-center font-sans text-body-l font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
            >
              {t("tickets")}
            </Link>
            <Link
              href="/shop"
              onClick={() => setMobileOpen(false)}
              className="rounded-pill border-2 border-black02 px-5 py-3.5 text-center font-sans text-body-l font-bold text-black02"
            >
              {t("shop")}
            </Link>
            <div className="flex justify-center pt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      </div>
    </nav>
  );
}
