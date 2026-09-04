"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "@phosphor-icons/react";
import { reportGalleryCard } from "@/lib/dp/gallery";
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
 * COLUMN-BASED MASONRY, built from explicit flex columns rather than CSS
 * `columns`. Both give the masonry stagger, but only explicit columns can be
 * animated independently — and independent columns are the whole effect here:
 * they travel in alternating directions, at slightly different speeds, and one
 * of them has to be able to stop on its own when you point at it.
 *
 * The wall is WIDER THAN THE SCREEN and offset, so the outermost columns run
 * off both edges. Nothing lines up with the viewport, which is what stops it
 * reading as a grid that happens to be moving.
 *
 * The page does not scroll — the content does. Under reduced motion that is
 * reversed: nothing moves on its own and the wall becomes an ordinary
 * scrollable list, because "no motion" must not mean "no access".
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

  /* Column count by breakpoint rather than by measuring: a ResizeObserver
     here would mean a setState per resize frame, and the count only has a
     handful of useful values anyway. */
  const wide = useMediaQuery("(min-width: 640px)");
  const wider = useMediaQuery("(min-width: 900px)");
  const widest = useMediaQuery("(min-width: 1280px)");
  const huge = useMediaQuery("(min-width: 1700px)");
  /* The wall is ~1.56x the viewport once the bleed and the tilt's scale are
     applied, so these are lower than they look: seven columns at 1440px is
     about a 320px card. Nine was a swatch; six was a poster. */
  const columnCount = huge ? 8 : widest ? 7 : wider ? 6 : wide ? 4 : 3;

  const [hovered, setHovered] = useState<{ column: number; id: string } | null>(
    null,
  );

  /* Dealt round-robin so neighbouring columns never start with the same card,
     and repeated until every column has enough to fill a tall screen twice
     over — the loop needs two copies of a full column to be seamless. */
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
              reportLabel={t("report")}
              reportedLabel={t("reported")}
              reportFailedLabel={t("reportFailed")}
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
  reportLabel,
  reportedLabel,
  reportFailedLabel,
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
  reportLabel: string;
  reportedLabel: string;
  reportFailedLabel: string;
  placeholder: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  /* Live values the animation reads, so changing them never restarts it —
     a paused column must resume from where it stopped, not from the top. */
  const pausedRef = useRef(paused);
  const offsetRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (calm) return;
    const track = trackRef.current;
    if (!track) return;

    // Odd columns travel the other way. Starting an upward column at -half
    // and a downward one at 0 keeps both wrapped inside the same range.
    const up = index % 2 === 0;
    const speed = BASE_SPEED + ((index * 7) % SPEED_JITTER);
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      // Half the track is one full copy of the column; wrapping at that
      // point is what makes the loop seamless.
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
        {/* Two copies: the second is what the first wraps into. It is
            aria-hidden so the wall is not read out twice. */}
        {[0, 1].map((copy) =>
          cards.map((card, i) => (
            <WallTile
              key={`${copy}-${card.id}-${i}`}
              card={card}
              label={label}
              reportLabel={reportLabel}
              reportedLabel={reportedLabel}
              reportFailedLabel={reportFailedLabel}
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
  reportLabel,
  reportedLabel,
  reportFailedLabel,
  placeholder,
  duplicate,
  spotlit,
  dimmed,
  onHover,
}: {
  card: WallCard;
  label: string;
  reportLabel: string;
  reportedLabel: string;
  reportFailedLabel: string;
  placeholder: boolean;
  duplicate: boolean;
  spotlit: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}) {
  const [reportState, setReportState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  async function report() {
    if (reportState !== "idle") return;
    setReportState("sending");
    try {
      await reportGalleryCard(card.id);
      setReportState("sent");
    } catch {
      setReportState("error");
    }
  }

  return (
    <figure
      aria-hidden={duplicate}
      onPointerEnter={() => onHover(card.id)}
      onPointerLeave={() => onHover(null)}
      className={`wall-tile relative ${spotlit ? "is-spotlit" : ""} ${
        dimmed ? "is-dimmed" : ""
      }`}
    >
      {/* Not next/image: the real cards come from signed, expiring Supabase
          URLs on a host the optimiser is not configured for, and a wall of
          thumbnails is exactly the case where optimisation buys least. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.imageUrl}
        /* The name left the surface but not the page: it is the only thing
           that identifies whose card this is, so it stays in the alt text. */
        alt={placeholder ? label : `${card.nickname} — ${label}`}
        loading="lazy"
        decoding="async"
        className={`block w-full rounded-md border-2 border-black02 bg-pastel object-cover ${
          card.ratio === "3:4" ? "aspect-[3/4]" : "aspect-square"
        }`}
      />
      {!placeholder && !duplicate && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void report();
          }}
          disabled={reportState === "sending" || reportState === "sent"}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-pill border-2 border-black02 bg-offwhite px-2.5 py-1 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 disabled:opacity-70"
        >
          <Flag size={12} weight="bold" aria-hidden />
          {reportState === "sent"
            ? reportedLabel
            : reportState === "error"
              ? reportFailedLabel
              : reportLabel}
        </button>
      )}
    </figure>
  );
}
