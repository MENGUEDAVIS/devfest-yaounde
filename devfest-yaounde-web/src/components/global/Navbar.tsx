"use client";

import { List, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
          className="logo-interactive relative flex shrink-0 items-center gap-2.5 whitespace-nowrap font-sans text-heading-m font-bold text-black02 transition-transform duration-200 ease-bouncy hover:scale-105"
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
          className="shrink-0 rounded-pill p-1.5 transition-transform duration-200 ease-bouncy hover:scale-110 active:scale-90 lg:hidden"
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

      {/* Mobile sheet — animates open with the same grid-rows collapse trick */}
      <div
        className="grid transition-[grid-template-rows] duration-400 ease-out-devfest motion-reduce:transition-none lg:hidden"
        style={{ gridTemplateRows: mobileOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4 flex flex-col gap-1 border-t-2 border-black02/10 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? undefined : -1}
                className="rounded-md px-2 py-2 font-sans text-body-l font-bold text-black02 transition-colors hover:bg-pastel"
              >
                {t(link.key)}
              </Link>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <LanguageSwitcher />
              <Link
                href="/shop"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? undefined : -1}
                className="rounded-pill border-2 border-black02 px-4 py-2 font-sans text-body-m font-bold text-black02"
              >
                {t("shop")}
              </Link>
              <Link
                href="/tickets"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? undefined : -1}
                className="rounded-pill border-2 border-black02 bg-primary px-4 py-2 font-sans text-body-m font-bold text-black02"
              >
                {t("tickets")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
