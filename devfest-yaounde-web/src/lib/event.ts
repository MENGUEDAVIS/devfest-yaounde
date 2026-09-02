import { EVENT_BASE_DATE } from "./calendar";
import { SITE_URL } from "./site-config";

/**
 * The event's own facts, in one place.
 *
 * Structured data, metadata and the calendar links all read from here, so
 * there is one thing to edit when the date and the venue are finally
 * confirmed — and nothing that can disagree with the calendar buttons about
 * when DevFest actually is.
 *
 * WHAT IS STILL UNCONFIRMED: the date (`EVENT_BASE_DATE`, still null) and the
 * venue. `docs/setup/remaining-work.md` §1 tracks both. The `Event`
 * structured data below switches itself ON the moment a date lands.
 */
export const EVENT = {
  name: "DevFest Yaoundé",
  organizer: "GDG Yaoundé",
  /** Two days, the second derived — same assumption `calendar.ts` makes. */
  days: 2,
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
  baseDate: string | null = EVENT_BASE_DATE,
): { start: string; end: string } | null {
  if (!baseDate) return null;
  const [y, m, d] = baseDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + (EVENT.days - 1));
  const iso = (date: Date, time: string) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}T${time}:00`;
  return { start: iso(start, EVENT.startTime), end: iso(end, EVENT.endTime) };
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
 * So this stays silent, and turns itself on the moment `EVENT_BASE_DATE` is
 * set in `calendar.ts` — the same switch that reveals the add-to-calendar
 * buttons. One edit, both features.
 */
export function eventJsonLd(
  locale: "fr" | "en",
  description: string,
  baseDate: string | null = EVENT_BASE_DATE,
) {
  const dates = eventDates(baseDate);
  if (!dates) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: EVENT.name,
    description,
    startDate: dates.start,
    endDate: dates.end,
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
