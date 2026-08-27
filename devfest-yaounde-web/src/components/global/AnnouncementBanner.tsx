"use client";

import { X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { marqueeLoop } from "@/lib/motion";

export function AnnouncementBanner({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("announcement");
  const message = t("message");

  return (
    <div className="flex w-full items-center gap-3 overflow-hidden rounded-t-2xl bg-blue-pastel px-4 py-2 text-black02">
      <div className="flex-1 overflow-hidden">
        <div className={`${marqueeLoop} flex w-max gap-16 whitespace-nowrap`}>
          <span className="text-body-m">{message}</span>
          <span className="text-body-m" aria-hidden>
            {message}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="shrink-0 rounded-pill p-1 transition-colors hover:bg-black02/10"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}
