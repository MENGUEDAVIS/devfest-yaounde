"use client";

import { List, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { bouncyPop } from "@/lib/motion";
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

export function Navbar({ attached }: { attached: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const clickTimestamps = useRef<number[]>([]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogoClick() {
    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current, now].filter(
      (t) => now - t < CONFETTI_CLICK_WINDOW_MS,
    );
    if (clickTimestamps.current.length >= CONFETTI_CLICK_THRESHOLD) {
      clickTimestamps.current = [];
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
    }
  }

  return (
    <nav
      className={`w-full ${attached ? "rounded-t-none rounded-b-full" : "rounded-full"} ${
        scrolled ? "bg-offwhite/85 shadow-md backdrop-blur-md" : "bg-offwhite"
      } px-4 py-2.5 transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out-devfest)] md:px-6 md:py-3`}
    >
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="relative shrink-0 whitespace-nowrap font-sans text-heading-m font-bold text-black02"
        >
          DevFest Yaoundé
          {showConfetti && <ConfettiBurst />}
        </button>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-body-m font-sans transition-colors ${
                  isActive
                    ? "text-blue underline decoration-2 underline-offset-4"
                    : "text-black02 hover:text-blue"
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Link
            href="/shop"
            className="whitespace-nowrap rounded-pill border-2 border-green px-4 py-1.5 text-body-m font-bold text-green transition-colors hover:bg-green-pastel"
          >
            {t("shop")}
          </Link>
          <Link
            href="/tickets"
            className="whitespace-nowrap rounded-pill bg-yellow px-4 py-1.5 text-body-m font-bold text-black02 transition-transform hover:scale-[1.03] active:scale-95"
          >
            {t("tickets")}
          </Link>
        </div>

        <button
          type="button"
          className="p-1 md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className={`${bouncyPop} mt-4 flex origin-top flex-col gap-4 border-t border-black02/10 pt-4 md:hidden`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-body-m font-sans text-black02"
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <LanguageSwitcher />
            <Link
              href="/shop"
              onClick={() => setMobileOpen(false)}
              className="rounded-pill border-2 border-green px-4 py-1.5 text-body-m font-bold text-green"
            >
              {t("shop")}
            </Link>
            <Link
              href="/tickets"
              onClick={() => setMobileOpen(false)}
              className="rounded-pill bg-yellow px-4 py-1.5 text-body-m font-bold text-black02"
            >
              {t("tickets")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
