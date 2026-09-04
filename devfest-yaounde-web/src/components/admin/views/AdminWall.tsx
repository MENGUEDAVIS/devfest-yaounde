"use client";

import { useState } from "react";
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
        Click a card to hide it from the public wall — grey and faded means off.
        Takedown requests come to gdgyaounde@gmail.com. Do not leave a card of a
        child up.
      </InfoBanner>
      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
          {error}
        </p>
      )}
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black02/30 px-4 py-10 text-center text-body-m text-black02/70">
          No cards stored yet.
        </p>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {cards.map((card) => {
            const off = !card.visible || card.status === "rejected";
            return (
              <li key={card.id} className="mb-3 break-inside-avoid">
                <button
                  type="button"
                  disabled={busy === card.id || card.status === "rejected"}
                  onClick={() => void toggle(card)}
                  aria-pressed={!off}
                  aria-label={
                    off
                      ? `Show ${card.nickname} on the wall`
                      : `Hide ${card.nickname} from the wall`
                  }
                  className={`block w-full text-left transition-[filter,opacity] ${
                    off ? "opacity-40 grayscale" : ""
                  }`}
                >
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt=""
                      className="block h-auto w-full"
                    />
                  ) : (
                    <div className="aspect-square bg-pastel" />
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
