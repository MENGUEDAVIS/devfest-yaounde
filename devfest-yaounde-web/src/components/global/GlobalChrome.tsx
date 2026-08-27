"use client";

import { useSessionDismissed } from "@/lib/use-session-dismissed";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { Navbar } from "./Navbar";

const DISMISS_KEY = "devfest-announcement-dismissed";

export function GlobalChrome() {
  const [dismissed, dismiss] = useSessionDismissed(DISMISS_KEY);
  const bannerVisible = !dismissed;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="w-full max-w-3xl">
        {bannerVisible && <AnnouncementBanner onDismiss={dismiss} />}
        <Navbar attached={bannerVisible} />
      </div>
    </div>
  );
}
