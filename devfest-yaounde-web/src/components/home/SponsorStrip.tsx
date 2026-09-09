/*
 * eslint-disable @next/next/no-img-element
 *
 * A plain <img> here is the considered choice, not the unfinished one. Logo
 * URLs are the least controlled in the store — uploaded to our bucket in the
 * normal case, but a seed file or an import can carry any host — and
 * `next/image` throws a 500 on a host that is not in `remotePatterns`. An
 * unoptimised logo is a far better failure than a sponsor strip that takes
 * the home page down. Logos are also small and frequently SVG, where the
 * optimiser has nothing to win.
 */
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Sponsor } from "@/data/types";
import type { SponsorCallSettings } from "@/lib/admin/shape";
import {
  sponsorCallOpen,
  sponsorSeats,
  SPONSOR_SEATS,
} from "@/lib/content/sponsors";
import { marqueeLoop, marqueeTrack } from "@/lib/motion";

/**
 * The strip of logos across the bottom of the hero — and, right now, mostly
 * the strip of seats where logos are going to be.
 *
 * IT USED TO HIDE ITSELF when no sponsor had signed, which was the right fix
 * for the wrong problem: an empty marquee reads as broken. But a strip that
 * is absent tells a company reading the site nothing at all, and this is the
 * one surface where "there is room for you here" is worth saying out loud.
 *
 * So the seats are drawn either way. Three logos beside three open seats is a
 * more honest and more persuasive picture than three logos alone.
 *
 * WHY THE MARQUEE IS CONDITIONAL. It scrolls only once the seats are full.
 * While any seat is open there is nothing to scroll past — the row fits — and
 * animating a line of dashed placeholders would read as a loading skeleton,
 * which is the one thing it must not look like.
 */
export async function SponsorStrip({
  sponsors,
  call,
  className = "",
  style,
}: {
  sponsors: Sponsor[];
  call: SponsorCallSettings;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = await getTranslations("home.sponsors");
  const seats = sponsorSeats(sponsors);
  const scrolls = sponsors.length >= SPONSOR_SEATS;
  const asking = sponsorCallOpen(call);
  const open = seats.length - sponsors.length;

  return (
    <div
      className={`relative z-20 shrink-0 border-t-2 border-black02 bg-offwhite py-3.5 ${className}`}
      style={style}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 sm:px-8">
        <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
          {sponsors.length > 0 ? t("label") : t("labelEmpty")}
        </p>

        {/*
          The ask sits in the label row, pinned. Never inside the track: a
          button that scrolls past is a button you have to chase.
        */}
        {asking && (
          <a
            href={call.prospectusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 rounded-pill border-2 border-black02 bg-primary px-3.5 py-1 font-sans text-caption font-bold text-black02 transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 motion-reduce:transform-none"
          >
            {t("cta")}
            <ArrowUpRight
              size={13}
              weight="bold"
              aria-hidden
              className="transition-transform duration-200 ease-bouncy group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            />
          </a>
        )}
      </div>

      <div
        className={`${scrolls ? `${marqueeTrack} overflow-hidden` : ""} mt-2.5`}
      >
        <div
          className={
            scrolls
              ? // No flex `gap` in the scrolling case — spacing is a per-item
                // margin so the -50% loop lands exactly on the seam.
                `${marqueeLoop} flex w-max items-center`
              : "mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 sm:gap-4 sm:px-8"
          }
        >
          {(scrolls ? [...seats, ...seats] : seats).map((seat, i) =>
            seat.kind === "filled" ? (
              <SponsorLogo
                key={`${seat.sponsor.id}-${i}`}
                sponsor={seat.sponsor}
                duplicate={scrolls && i >= seats.length}
                scrolls={scrolls}
              />
            ) : (
              <EmptySeat
                key={`empty-${seat.index}-${i}`}
                /* Only the first open seat is captioned. Six boxes each
                   repeating "your logo here" is a nag; one labelled seat in a
                   row of waiting ones is an invitation. */
                label={seat.index === 0 ? t("seat") : undefined}
                scrolls={scrolls}
                /* Past the third they are decoration — and on a phone they
                   are decoration that wraps onto a second and third line. */
                hideOnMobile={seat.index >= 3}
              />
            ),
          )}
        </div>
      </div>

      {/* The count, for anyone who cannot see a row of dashed boxes. The
          visual seats are decorative and hidden from AT; this sentence is
          what carries their meaning. */}
      {open > 0 && <p className="sr-only">{t("openSeats", { count: open })}</p>}
    </div>
  );
}

/**
 * Logos are LINKS now, and bigger than they were.
 *
 * A sponsor's logo on a page that does not go to their site is a thank-you
 * card with the address torn off — and it opens in a new tab, because
 * somebody clicking a sponsor is browsing, not leaving.
 */
function SponsorLogo({
  sponsor,
  duplicate,
  scrolls,
}: {
  sponsor: Sponsor;
  duplicate: boolean;
  scrolls: boolean;
}) {
  const logo = (
    <img
      src={sponsor.logoUrl}
      alt={sponsor.name}
      className="h-11 w-auto object-contain sm:h-14"
    />
  );

  const box = scrolls ? "mx-7 shrink-0 sm:mx-9" : "shrink-0";

  // The duplicated half of a marquee is the same content twice: announcing it
  // reads the sponsor list out twice, and giving it a second focusable link
  // means tabbing through the same companies again.
  if (duplicate) {
    return (
      <span aria-hidden className={box} tabIndex={-1}>
        {logo}
      </span>
    );
  }

  if (!sponsor.websiteUrl) return <span className={box}>{logo}</span>;

  return (
    <a
      href={sponsor.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${box} rounded-md transition-transform duration-200 ease-bouncy hover:scale-105 motion-reduce:transform-none`}
    >
      {logo}
    </a>
  );
}

/**
 * A seat still going: a dashed outline the size of a logo.
 *
 * Sized to a LOGO rather than to its caption, so an uncaptioned seat is
 * plainly the same kind of thing as the labelled one beside it — a slot —
 * instead of a smaller box of unclear purpose.
 */
function EmptySeat({
  label,
  scrolls,
  hideOnMobile,
}: {
  label?: string;
  scrolls: boolean;
  hideOnMobile: boolean;
}) {
  return (
    <span
      // Decorative in every case: the sr-only count above states how many
      // seats are open, which is the fact. A screen reader working through
      // six unlabelled boxes learns nothing.
      aria-hidden
      className={[
        hideOnMobile ? "hidden sm:flex" : "flex",
        scrolls ? "mx-7 sm:mx-9" : "",
        "h-11 min-w-24 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-black02/25 px-4 sm:h-14 sm:min-w-32 sm:px-6",
      ].join(" ")}
    >
      {label && (
        <span className="whitespace-nowrap font-mono text-caption font-bold uppercase tracking-wide text-black02/40">
          {label}
        </span>
      )}
    </span>
  );
}
