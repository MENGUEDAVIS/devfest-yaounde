"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/lib/use-media-query";
import type { WallCard } from "@/data/wall-placeholders";

/** Pixels per second a column travels. Slow enough to read a name in passing. */
const BASE_SPEED = 18;
/** Each column runs a little differently, or the wall reads as one sheet. */
const SPEED_JITTER = 5;
/** The whole wall leans, so cards never travel perfectly vertically. */
const TILT_DEG = -4;

/**
 * The community wall.
 *
 * COLUMN-BASED MASONRY. Cards keep the size and corners they were composed
 * with: the JPEG is shown at its native ratio (`height: auto`), no CSS
 * `object-cover` crop and no forced `border-radius` on top of the artwork.
 */
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
  const t = useTranslations("pages.wall");
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");

  const wide = useMediaQuery("(min-width: 640px)");
  const wider = useMediaQuery("(min-width: 900px)");
  const widest = useMediaQuery("(min-width: 1280px)");
  const huge = useMediaQuery("(min-width: 1700px)");
  const columnCount = huge ? 8 : widest ? 7 : wider ? 6 : wide ? 4 : 3;

  const [hovered, setHovered] = useState<{ column: number; id: string } | null>(
    null,
  );

  const columns = useMemo(() => {
    const out: WallCard[][] = Array.from({ length: columnCount }, () => []);
    if (cards.length === 0) return out;
    const perColumn = Math.max(6, Math.ceil(18 / columnCount) * 3);
    for (let c = 0; c < columnCount; c++) {
      for (let i = 0; i < perColumn; i++) {
        out[c].push(cards[(c + i * columnCount) % cards.length]);
      }
    }
    return out;
  }, [cards, columnCount]);

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
              hoveredId={hovered?.column === index ? hovered.id : null}
              onHover={(id) =>
                setHovered(id === null ? null : { column: index, id })
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
  hoveredId,
  onHover,
  label,
  placeholder,
}: {
  index: number;
  cards: WallCard[];
  calm: boolean;
  paused: boolean;
  dimmed: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
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
          cards.map((card, i) => (
            <WallTile
              key={`${copy}-${card.id}-${i}`}
              card={card}
              label={label}
              placeholder={placeholder}
              duplicate={copy === 1}
              spotlit={hoveredId === card.id}
              dimmed={dimmed && hoveredId !== card.id}
              onHover={onHover}
            />
          )),
        )}
      </div>
    </div>
  );
}

function WallTile({
  card,
  label,
  placeholder,
  duplicate,
  spotlit,
  dimmed,
  onHover,
}: {
  card: WallCard;
  label: string;
  placeholder: boolean;
  duplicate: boolean;
  spotlit: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <figure
      aria-hidden={duplicate}
      onPointerEnter={() => onHover(card.id)}
      onPointerLeave={() => onHover(null)}
      className={`wall-tile ${spotlit ? "is-spotlit" : ""} ${
        dimmed ? "is-dimmed" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.imageUrl}
        alt={placeholder ? label : `${card.nickname} — ${label}`}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full bg-transparent"
      />
    </figure>
  );
}
