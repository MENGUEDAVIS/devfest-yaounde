"use client";

import { DownloadSimple, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSessionDismissed } from "@/lib/use-session-dismissed";

const DISMISS_KEY = "devfest-install-dismissed";

/** The event Chromium fires instead of showing its own install UI immediately. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * A visible "Install" affordance, not just a manifest and a hope
 * (PHASE22 §F, ADR 0066).
 *
 * `beforeinstallprompt` only fires on Chromium browsers that have already
 * decided the site MEETS the installability bar — a valid manifest, HTTPS,
 * and a service worker with a fetch handler (`public/sw.js`). Firefox and
 * Safari never fire it at all; on those, the browser's own "Add to Home
 * Screen" menu item is the only install path, and this component simply
 * never renders there, which is correct — there is nothing for it to do.
 *
 * Dismissing hides it for the rest of the session only (`sessionStorage`,
 * not `localStorage`): the manifest and service worker are still genuinely
 * installable, so a permanent "never ask again" would quietly turn this
 * into dead code the moment someone dismissed it once, weeks before the
 * event when it would actually matter.
 */
export function InstallPrompt() {
  const t = useTranslations("offline");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, dismiss] = useSessionDismissed(DISMISS_KEY);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-pill border-2 border-black02 bg-primary px-4 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]">
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="flex items-center gap-2"
      >
        <DownloadSimple size={18} weight="bold" aria-hidden />
        {t("install")}
      </button>
      <button
        type="button"
        aria-label={t("installDismiss")}
        onClick={dismiss}
        className="shrink-0 rounded-pill p-1 hover:bg-black02/10"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
