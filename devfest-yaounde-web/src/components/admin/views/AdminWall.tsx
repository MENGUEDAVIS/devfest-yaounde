"use client";

import { useState } from "react";
import { Flag } from "@phosphor-icons/react";
import type { AdminData, AdminWallCard } from "@/lib/admin/shape";
import { InfoBanner } from "./shared";

export function AdminWall({ data }: { data: AdminData }) {
  const [cards, setCards] = useState<AdminWallCard[]>(data.wallCards);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data.wallEnabled) {
    return (
      <InfoBanner tone="warn">
        `NEXT_PUBLIC_DP_GALLERY=0` is set, so the wall is dark. Set it to 1 (or
        unset it) to switch it back on.
      </InfoBanner>
    );
  }

  const flagged = cards
    .filter((card) => card.reportCount > 0 && card.status !== "rejected")
    .sort((a, b) => b.reportCount - a.reportCount);
  const rest = cards.filter((card) => !flagged.includes(card));
  const ordered = [...flagged, ...rest];

  async function toggle(card: AdminWallCard) {
    if (card.status === "rejected") return;
    setBusy(card.id);
    setError(null);
    const next = !card.visible;
    const res = await fetch(`/api/dp/gallery/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: next }),
    });
    if (!res.ok) {
      setError("Could not update that card.");
      setBusy(null);
      return;
    }
    setCards((prev) =>
      prev.map((row) => (row.id === card.id ? { ...row, visible: next } : row)),
    );
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <InfoBanner>
        Cards go public the moment someone downloads, shares or copies (ADR
        0034). Click a card to hide it — grey and faded means off the public
        wall. Reported cards are listed first. Do not leave a card of a child
        up.
      </InfoBanner>
      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
          {error}
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black02/30 px-4 py-10 text-center text-body-m text-black02/70">
          No cards stored yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ordered.map((card) => {
            const off = !card.visible || card.status === "rejected";
            return (
              <li key={card.id}>
                <button
                  type="button"
                  disabled={busy === card.id || card.status === "rejected"}
                  onClick={() => void toggle(card)}
                  className={`relative w-full overflow-hidden rounded-lg border border-black02/20 text-left transition-[filter,opacity] ${
                    off ? "opacity-40 grayscale" : ""
                  }`}
                >
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square bg-pastel" />
                  )}
                  <span className="block truncate px-2 py-1.5 font-sans text-caption font-bold text-black02">
                    {card.nickname}
                  </span>
                  {card.reportCount > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-pill border border-black02 bg-primary px-2 py-0.5 font-mono text-mono-tag font-bold">
                      <Flag size={10} weight="fill" aria-hidden />
                      {card.reportCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
