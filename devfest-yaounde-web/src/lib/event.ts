import { EVENT_DATES } from "./calendar";
import { SITE_URL } from "./site-config";

/**
 * The event's own facts, in one place.
 *
 * Structured data, metadata and the calendar links all read from here, so
 * there is one thing to edit when the date and the venue are finally
 * confirmed — and nothing that can disagree with the calendar buttons about
 * when DevFest actually is.
 *
 * WHAT IS CONFIRMED: the dates. 21 and 28 November 2026, confirmed by the
 * organisers on 2026-09-08 — two Saturdays, not a range. They live in
 * `EVENT_DATES` in `calendar.ts`.
 *
 * WHAT IS STILL UNCONFIRMED: the venue. `docs/setup/remaining-work.md` §1
 * tracks it; filled in, it turns the `Place` below from a city into an
 * address.
 */
export const EVENT = {
  name: "DevFest Yaoundé",
  organizer: "GDG Yaoundé",
  /**
   * The edition. Taken from the chapter's own event slug in `site-config.ts`
   * ("…devfest-yaounde-2026…"), which is the only confirmed statement of the
   * year in the repo — not a guess, but worth re-checking against the real
   * listing before launch.
   */
  year: 2026,
  /**
   * How many days the event runs. Derived from `EVENT_DATES` rather than
   * stated separately, so the count and the dates cannot disagree — they
   * previously could, and the arithmetic that reconciled them was wrong.
   */
  get days() {
    return EVENT_DATES.length;
  },
  /** Local start/end times, used only when a real date exists. */
  startTime: "09:00",
  endTime: "18:00",
  city: "Yaoundé",
  region: "Centre",
  country: "CM",
  /** No venue has been announced. Filled in, this appears in rich results. */
  venue: null as string | null,
  venueStreet: null as string | null,
} as const;

/**
 * ISO start/end for the whole event, or null while the date is unconfirmed.
 *
 * `baseDate` defaults to the real flag and is only ever passed explicitly by
 * the tests — the branch that matters most is the one that cannot be reached
 * today, so it has to be reachable somehow.
 */
export function eventDates(
  dates: readonly string[] = EVENT_DATES,
): { start: string; end: string } | null {
  if (dates.length === 0) return null;
  const first = dates[0];
  const last = dates[dates.length - 1];
  return {
    start: `${first}T${EVENT.startTime}:00`,
    end: `${last}T${EVENT.endTime}:00`,
  };
}

/** Each event day as its own start/end pair, in order. */
export function eventDayRanges(
  dates: readonly string[] = EVENT_DATES,
): { start: string; end: string }[] {
  return dates.map((date) => ({
    start: `${date}T${EVENT.startTime}:00`,
    end: `${date}T${EVENT.endTime}:00`,
  }));
}

/**
 * `Organization` for GDG Yaoundé. Always emitted — none of it is speculative.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: EVENT.organizer,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/d-logo-left.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: EVENT.city,
      addressRegion: EVENT.region,
      addressCountry: EVENT.country,
    },
  };
}

/**
 * `Event`, or null while the date is unknown.
 *
 * Returning null is the point. `startDate` is REQUIRED by schema.org, so an
 * Event block without one is invalid structured data — Search Console reports
 * it as an error and no rich result appears either way. Inventing a date to
 * satisfy the validator would be worse still: it would publish a wrong date
 * to every crawler that reads it.
 *
 * So this stays silent, and turns itself on the moment `EVENT_DATES` has an
 * entry in `calendar.ts` — the same switch that reveals the add-to-calendar
 * buttons. One edit, both features.
 *
 * **`subEvent` is why this is not just a start and an end.** The two days are
 * a week apart, so `startDate: 21 Nov` with `endDate: 28 Nov` on its own
 * tells a crawler this is one continuous eight-day event, which is wrong in
 * exactly the way a rich result would show: "Nov 21 – 28". The outer range
 * still spans the whole thing, because that IS when the event begins and
 * ends, and each real day is listed as a `subEvent` so the shape is
 * recoverable rather than implied.
 */
export function eventJsonLd(
  locale: "fr" | "en",
  description: string,
  dates: readonly string[] = EVENT_DATES,
) {
  const range = eventDates(dates);
  if (!range) return null;
  const days = eventDayRanges(dates);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: EVENT.name,
    description,
    startDate: range.start,
    endDate: range.end,
    ...(days.length > 1
      ? {
          subEvent: days.map((day, i) => ({
            "@type": "Event",
            name: `${EVENT.name} — ${locale === "fr" ? "Jour" : "Day"} ${i + 1}`,
            startDate: day.start,
            endDate: day.end,
          })),
        }
      : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}/${locale}`,
    image: [`${SITE_URL}/og?title=${encodeURIComponent(EVENT.name)}`],
    location: {
      "@type": "Place",
      name: EVENT.venue ?? EVENT.city,
      address: {
        "@type": "PostalAddress",
        ...(EVENT.venueStreet ? { streetAddress: EVENT.venueStreet } : {}),
        addressLocality: EVENT.city,
        addressRegion: EVENT.region,
        addressCountry: EVENT.country,
      },
    },
    organizer: {
      "@type": "Organization",
      name: EVENT.organizer,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/${locale}/tickets`,
      priceCurrency: "XAF",
      availability: "https://schema.org/InStock",
    },
  };
}
