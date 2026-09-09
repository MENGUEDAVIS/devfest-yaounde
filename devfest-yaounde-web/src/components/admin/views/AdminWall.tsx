"use client";

import { useMemo, useState } from "react";
import { DownloadSimple, Flag, Trash } from "@phosphor-icons/react";
import type { AdminData, AdminWallCard } from "@/lib/admin/shape";
import { Segmented } from "../forms/fields";
import { useToast } from "../forms/Toast";
import { InfoBanner } from "./shared";

type WallFilter = "all" | "visible" | "hidden";

export function AdminWall({ data }: { data: AdminData }) {
  const toast = useToast();
  const [cards, setCards] = useState<AdminWallCard[]>(data.wallCards);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WallFilter>("all");

  const shown = useMemo(() => {
    if (filter === "all") return cards;
    // A rejected card counts as hidden: it is not on the wall either.
    const isVisible = (c: AdminWallCard) =>
      c.visible && c.status !== "rejected";
    return cards.filter((c) =>
      filter === "visible" ? isVisible(c) : !isVisible(c),
    );
  }, [cards, filter]);

  if (!data.wallEnabled) {
    return (
      <InfoBanner tone="warn">
        `NEXT_PUBLIC_DP_GALLERY=0` is set, so the wall is dark. Set it to 1 (or
        unset it) to switch it back on.
      </InfoBanner>
    );
  }

  /**
   * Hide or show a card.
   *
   * OPTIMISTIC, then reverted if the server disagrees. The card flips
   * immediately and wears a shimmer until the round trip lands, because a
   * toggle that does nothing for a second reads as a toggle that missed —
   * and the reaction to that is to click it again, which would queue a second
   * write undoing the first.
   *
   * On failure the flip is rolled back and a toast says so. Silently leaving
   * the card flipped would be worse than not flipping it at all: the screen
   * would disagree with the wall, and nobody would know which was right.
   */
  async function toggle(card: AdminWallCard) {
    if (card.status === "rejected" || busy) return;
    setBusy(card.id);
    setError(null);
    const next = !card.visible;
    setCards((prev) =>
      prev.map((row) => (row.id === card.id ? { ...row, visible: next } : row)),
    );

    try {
      const res = await fetch(`/api/dp/gallery/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: next }),
      });
      if (!res.ok) throw new Error("patch failed");
      toast.push("ok", next ? "Back on the wall." : "Hidden from the wall.");
    } catch {
      setCards((prev) =>
        prev.map((row) =>
          row.id === card.id ? { ...row, visible: card.visible } : row,
        ),
      );
      toast.push("error", "Could not update that card — put back as it was.");
    }
    setBusy(null);
  }

  /**
   * Delete the card — the row and the image.
   *
   * This used to send `PATCH { status: "rejected" }`, because `DELETE` needed
   * the submitter's token and an organiser has no way to hold one. The
   * comment here claimed rejecting was "the real equivalent". It was not:
   * rejecting removes the IMAGE and keeps the ROW, so the card came straight
   * back into this grid on the next load, now with nothing to show — you
   * could press delete on the same card four times and it would still be
   * there. `DELETE` now accepts an organiser session, so delete deletes.
   */
  async function remove(card: AdminWallCard) {
    setBusy(card.id);
    setError(null);
    const res = await fetch(`/api/dp/gallery/${card.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Could not delete that card.");
      setBusy(null);
      setConfirming(null);
      return;
    }
    setCards((prev) => prev.filter((row) => row.id !== card.id));
    setBusy(null);
    setConfirming(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <InfoBanner>
        Click a card to hide it from the public wall — grey and faded means off.
        The trash icon deletes it outright: the image is removed from storage
        and it drops off the wall for good. Takedown requests come to
        gdgyaounde@gmail.com. Do not leave a card of a child up.
      </InfoBanner>
      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          name="wall-filter"
          value={filter}
          options={[
            { value: "all" as const, label: `All (${cards.length})` },
            {
              value: "visible" as const,
              label: `On the wall (${cards.filter((c) => c.visible && c.status !== "rejected").length})`,
            },
            {
              value: "hidden" as const,
              label: `Hidden (${cards.filter((c) => !c.visible || c.status === "rejected").length})`,
            },
          ]}
          onChange={setFilter}
        />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black02/30 px-4 py-10 text-center text-body-m text-black02/70">
          {filter === "all"
            ? "No cards stored yet."
            : filter === "visible"
              ? "Nothing is on the wall right now."
              : "Nothing is hidden."}
        </p>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {shown.map((card) => {
            const off = !card.visible || card.status === "rejected";
            const isBusy = busy === card.id;
            const isConfirming = confirming === card.id;
            return (
              <li key={card.id} className="relative mb-3 break-inside-avoid">
                <button
                  type="button"
                  disabled={isBusy || card.status === "rejected"}
                  onClick={() => void toggle(card)}
                  aria-pressed={!off}
                  aria-label={
                    off
                      ? `Show ${card.nickname} on the wall`
                      : `Hide ${card.nickname} from the wall`
                  }
                  className={`relative block w-full text-left transition-[filter,opacity] ${
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
                  {/* Covers this card only, so there is no question which
                      one the wait belongs to. */}
                  {isBusy && <span aria-hidden className="admin-shimmer" />}
                </button>

                {/*
                  A SIBLING of the toggle button, not nested inside it —
                  buttons cannot nest. Absolutely positioned over the same
                  card, on its own click target, so hiding and deleting can
                  never fire off the same tap.
                */}
                {card.reportCount > 0 && (
                  <span
                    title={`Reported ${card.reportCount}×`}
                    className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-pill bg-black02/75 px-2 py-0.5 text-caption font-bold text-offwhite"
                  >
                    <Flag size={11} weight="fill" aria-hidden />
                    {card.reportCount}
                  </span>
                )}

                {/*
                  Downloading is blocked on the PUBLIC wall — no context menu,
                  no drag, no long-press save — and allowed here. The
                  difference is not the file, it is who is asking: this side
                  has a server-checked organiser session in front of it.
                */}
                {card.imageUrl && (
                  <a
                    href={card.imageUrl}
                    download={`${card.nickname}-${card.id.slice(0, 8)}.webp`}
                    aria-label={`Download ${card.nickname}'s card`}
                    className="absolute right-10 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 transition-colors hover:bg-primary"
                  >
                    <DownloadSimple size={14} weight="bold" />
                  </a>
                )}

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirming(card.id)}
                  aria-label={`Delete ${card.nickname}'s card`}
                  className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-pill border-2 border-black02 bg-offwhite text-black02 transition-colors hover:bg-danger hover:text-offwhite disabled:opacity-50"
                >
                  <Trash size={14} weight="bold" />
                </button>

                {isConfirming && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black02/85 p-3 text-center">
                    <p className="text-caption font-bold text-offwhite">
                      Delete this card? The image is gone for good.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void remove(card)}
                        className="rounded-pill bg-danger px-3 py-1 text-caption font-bold text-offwhite disabled:opacity-50"
                      >
                        {isBusy ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirming(null)}
                        className="rounded-pill border-2 border-offwhite px-3 py-1 text-caption font-bold text-offwhite disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
