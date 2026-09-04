"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/lib/use-media-query";
import type { WallCard } from "@/data/wall-placeholders";
import { dealColumns } from "@/lib/dp/wall-layout";

/** Pixels per second a column travels. Slow enough to read a name in passing. */
const BASE_SPEED = 18;
/** Each column runs a little differently, or the wall reads as one sheet. */
const SPEED_JITTER = 5;
/** The whole wall leans, so cards never travel perfectly vertically. */
const TILT_DEG = -4;
/**
 * How often the wall re-asks what is on it.
 *
 * The wall is a display surface people leave open — at a venue, on a second
 * screen — so a card submitted while someone is watching should appear
 * without anyone reloading. This also refreshes the SIGNED image URLs, which
 * expire, so a long-lived tab does not decay into broken images.
 */
const REFRESH_MS = 45_000;

export function DpWall({
  cards: initialCards,
  placeholder,
  hasMore: initialMore = false,
}: {
  cards: WallCard[];
  placeholder: boolean;
  hasMore?: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(initialMore);

  useEffect(() => {
    if (!more || placeholder) return;
    let cancelled = false;
    const next = page + 1;
    fetch(`/api/dp/gallery?page=${next}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { cards?: WallCard[]; hasMore?: boolean } | null) => {
        if (cancelled || !data) {
          if (!cancelled) setMore(false);
          return;
        }
        const extra = data.cards ?? [];
        setCards((prev) => {
          const seen = new Set(prev.map((card) => card.id));
          return [...prev, ...extra.filter((card) => !seen.has(card.id))];
        });
        setMore(Boolean(data.hasMore) && extra.length > 0);
        if (data.hasMore && extra.length > 0) setPage(next);
      })
      .catch(() => {
        if (!cancelled) setMore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [more, page, placeholder]);
  /**
   * Keep the wall current without anyone reloading it.
   *
   * Two problems, one loop. A card submitted while somebody is watching
   * should appear on its own — the wall is a display surface people leave
   * open at a venue, not a page you refresh. And the image URLs are SIGNED
   * and expire, so a tab left open long enough decays into a wall of broken
   * images regardless of whether anything new was posted.
   *
   * The merge is deliberately conservative: existing cards keep their
   * POSITION and only have their URL refreshed, and genuinely new ids are
   * appended. Replacing the array wholesale would re-deal every column and
   * the whole wall would visibly jump every forty-five seconds.
   */
  useEffect(() => {
    if (placeholder) return;
    let cancelled = false;

    const id = window.setInterval(async () => {
      try {
        const response = await fetch("/api/dp/gallery", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { cards?: WallCard[] };
        const fresh = data.cards ?? [];
        if (cancelled || fresh.length === 0) return;

        setCards((prev) => {
          const byId = new Map(fresh.map((card) => [card.id, card]));
          const kept = prev.map((card) => byId.get(card.id) ?? card);
          const known = new Set(prev.map((card) => card.id));
          return [...kept, ...fresh.filter((card) => !known.has(card.id))];
        });
      } catch {
        // Offline, or a blip. The next tick tries again; a failed refresh
        // must never blank a wall that is currently rendering fine.
      }
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [placeholder]);

  const t = useTranslations("pages.wall");
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");

  const wide = useMediaQuery("(min-width: 640px)");
  const wider = useMediaQuery("(min-width: 900px)");
  const widest = useMediaQuery("(min-width: 1280px)");
  const huge = useMediaQuery("(min-width: 1700px)");
  const columnCount = huge ? 8 : widest ? 7 : wider ? 6 : wide ? 4 : 3;

  /**
   * Which TILE is under the pointer — identified by its position, not by the
   * card it shows.
   *
   * Keying this by `card.id` meant hovering one tile spotlit every copy of
   * that card in the column at once. With the old dealing that was the entire
   * column, which is the "I hovered and it hovered 3 cards" report.
   */
  const [hovered, setHovered] = useState<{
    column: number;
    key: string;
  } | null>(null);

  /**
   * Deal the cards into columns.
   *
   * The previous version indexed `cards[(c + i * columnCount) % cards.length]`,
   * which aliases catastrophically whenever the deck and the column count
   * share a factor: with three cards in three columns it reduces to
   * `c % 3 === c`, so **every column showed one person, repeated forever**.
   * That is what was on the wall.
   *
   * Now each column draws its own shuffle of the whole deck, re-shuffling
   * whenever it runs out, so a short deck repeats in a different order rather
   * than the same one. The seed is the column index alone — deliberately NOT
   * the deck size, so a new card arriving does not re-deal the entire wall
   * under the eyes of whoever is watching it.
   */
  const columns = useMemo(
    () => dealColumns(cards, columnCount),
    [cards, columnCount],
  );

  return (
    <div
      data-dp-wall
      className={
        calm
          ? "absolute inset-0 overflow-y-auto"
          : "wall-fade absolute inset-0 overflow-hidden"
      }
    >
      <div
        className="wall-tilt"
        style={{ ["--wall-tilt" as string]: `${TILT_DEG}deg` }}
      >
        <div className="flex gap-3 sm:gap-4">
          {columns.map((column, index) => (
            <WallColumn
              key={index}
              index={index}
              cards={column}
              calm={calm}
              paused={hovered?.column === index}
              dimmed={hovered !== null}
              hoveredKey={hovered?.column === index ? hovered.key : null}
              onHover={(key) =>
                setHovered(key === null ? null : { column: index, key })
              }
              label={t("cardLabel")}
              placeholder={placeholder}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WallColumn({
  index,
  cards,
  calm,
  paused,
  dimmed,
  hoveredKey,
  onHover,
  label,
  placeholder,
}: {
  index: number;
  cards: WallCard[];
  calm: boolean;
  paused: boolean;
  dimmed: boolean;
  hoveredKey: string | null;
  onHover: (key: string | null) => void;
  label: string;
  placeholder: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const offsetRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (calm) return;
    const track = trackRef.current;
    if (!track) return;

    const up = index % 2 === 0;
    const speed = BASE_SPEED + ((index * 7) % SPEED_JITTER);
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const half = track.scrollHeight / 2;
      if (half > 0 && !pausedRef.current) {
        offsetRef.current += (up ? -1 : 1) * speed * dt;
        if (offsetRef.current <= -half) offsetRef.current += half;
        if (offsetRef.current >= 0) offsetRef.current -= half;
      }
      track.style.transform = `translate3d(0, ${offsetRef.current.toFixed(2)}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    offsetRef.current = up ? 0 : -1;
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [calm, index]);

  return (
    <div className="wall-column min-w-0 flex-1">
      <div ref={trackRef} className="flex flex-col gap-3 sm:gap-4">
        {[0, 1].map((copy) =>
          cards.map((card, i) => {
            // Position, not card id: the same card legitimately appears more
            // than once in a column, and only the one under the pointer
            // should light up.
            const tileKey = `${copy}-${i}`;
            return (
              <WallTile
                key={tileKey}
                tileKey={tileKey}
                card={card}
                label={label}
                placeholder={placeholder}
                duplicate={copy === 1}
                spotlit={hoveredKey === tileKey}
                dimmed={dimmed && hoveredKey !== tileKey}
                onHover={onHover}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function WallTile({
  tileKey,
  card,
  label,
  placeholder,
  duplicate,
  spotlit,
  dimmed,
  onHover,
}: {
  tileKey: string;
  card: WallCard;
  label: string;
  placeholder: boolean;
  duplicate: boolean;
  spotlit: boolean;
  dimmed: boolean;
  onHover: (key: string | null) => void;
}) {
  return (
    <figure
      aria-hidden={duplicate}
      onPointerEnter={() => onHover(tileKey)}
      onPointerLeave={() => onHover(null)}
      className={`wall-tile ${spotlit ? "is-spotlit" : ""} ${
        dimmed ? "is-dimmed" : ""
      }`}
    >
      {/*
       * The wall is for looking at, not for taking from.
       *
       * These are photographs of real people who agreed to appear on a
       * community page — not to have their face saved off it by a passer-by.
       * So: no context menu, no drag-to-desktop, no long-press save sheet on
       * iOS, no text selection.
       *
       * Stated plainly, because it would be dishonest to imply otherwise:
       * this stops the CASUAL grab and nothing more. Anyone who opens the
       * network tab still has the URL. Real protection is the takedown path,
       * the retention rule and the fact that the bucket is private and served
       * through short-lived signed links — not this. Organisers download from
       * the admin, which is a different surface with a real gate in front.
       */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.imageUrl}
        alt={placeholder ? label : `${card.nickname} — ${label}`}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        className="wall-tile-image block h-auto w-full bg-transparent"
      />
    </figure>
  );
}
