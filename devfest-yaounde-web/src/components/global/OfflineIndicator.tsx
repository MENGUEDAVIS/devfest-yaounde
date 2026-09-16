"use client";

import { WifiSlash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { OFFLINE_PAGES } from "@/lib/pwa";

/**
 * "You're offline" — a clear, unmissable state, not a silent degrade
 * (PHASE22 §F, ADR 0066).
 *
 * `navigator.onLine` alone is unreliable at the instant a page loads (some
 * browsers report it before the network stack has actually settled), so
 * this reads it once on mount and then trusts only the `online`/`offline`
 * events after that — the same "watch the event, don't just poll a flag"
 * rule `CustomCursor` already applies to its own two media-query gates.
 */
export function OfflineIndicator() {
  const t = useTranslations("offline");
  const tNav = useTranslations("nav");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  if (!offline) return null;

  const pages = OFFLINE_PAGES.map((page) => tNav(page)).join(", ");

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-4 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
    >
      <WifiSlash size={18} weight="bold" aria-hidden className="shrink-0" />
      <span className="truncate">{t("banner", { pages })}</span>
    </div>
  );
}
