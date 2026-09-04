"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GALLERY_TOKENS_KEY,
  loadGalleryTokens,
  takeDownCard,
  type GalleryToken,
} from "@/lib/dp/gallery";

const empty: GalleryToken[] = [];
let cachedRaw = "";
let cachedTokens: GalleryToken[] = empty;

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot(): GalleryToken[] {
  const raw = window.localStorage.getItem(GALLERY_TOKENS_KEY) ?? "";
  if (raw === cachedRaw) return cachedTokens;
  cachedRaw = raw;
  cachedTokens = loadGalleryTokens();
  return cachedTokens;
}

function getServerSnapshot(): GalleryToken[] {
  return empty;
}

export function WallRemoveList() {
  const t = useTranslations("pages.wallRemove");
  const tokens = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);

  async function remove(row: GalleryToken) {
    setBusy(row.id);
    setFailed(null);
    const ok = await takeDownCard(row.id, row.token);
    if (ok) {
      setGone((prev) => [...prev, row.id]);
    } else {
      setFailed(row.id);
    }
    setBusy(null);
  }

  if (tokens.length === 0) {
    return (
      <div>
        <p className="text-body-m text-black02/80">{t("empty")}</p>
        <Link
          href="/wall/terms"
          className="mt-4 inline-block underline decoration-2 underline-offset-2"
        >
          {t("termsLink")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {tokens.map((row) => {
        const removed = gone.includes(row.id);
        return (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-black02 bg-offwhite px-4 py-3"
          >
            <span className="font-mono text-caption text-black02/70">
              {row.id.slice(0, 8)}
            </span>
            <button
              type="button"
              disabled={removed || busy === row.id}
              onClick={() => void remove(row)}
              className="rounded-pill border-2 border-black02 px-4 py-2 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
            >
              {removed
                ? t("removed")
                : busy === row.id
                  ? t("removing")
                  : t("remove")}
            </button>
            {failed === row.id && (
              <p className="w-full text-body-m font-bold text-black02">
                {t("failed")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
