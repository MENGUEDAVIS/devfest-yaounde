import type { Session } from "@/data/types";

/**
 * Add-to-calendar links (PAGES.md §3).
 *
 * Sessions carry only a time of day; these helpers resolve which DAY that
 * time falls on. While the dates were unknown the calendar UI stayed hidden
 * rather than exporting an event on a made-up day.
 *
 * **THE DAYS ARE NOT CONSECUTIVE, and that is the whole reason this is a
 * list.** Confirmed by the organisers on 2026-09-08: DevFest Yaoundé 2026
 * runs on **21 November and 28 November** — two Saturdays a week apart, not a
 * range. The Bevy listing shows "Nov 21–28", which reads as an eight-day
 * window and is what the previous model assumed: one base date, with day N
 * derived as `base + (N - 1)`. That put every day-2 session on **22
 * November**, six days early — in the add-to-calendar links people actually
 * import, and in the `endDate` published to crawlers.
 *
 * So the days are listed explicitly. A session's `day` is a 1-based index
 * into this array, nothing is inferred, and a third day would be one more
 * entry rather than a new assumption.
 */
export const EVENT_DATES: readonly string[] = ["2026-11-21", "2026-11-28"];

/**
 * The first day, or null if no dates are set.
 *
 * Kept because the calendar UI and the `Event` structured data both gate on
 * "is there a date at all", and that question has one answer whatever the
 * shape of the rest.
 */
export const EVENT_BASE_DATE: string | null = EVENT_DATES[0] ?? null;

/** The calendar date a given 1-based event day falls on. */
export function dateForDay(day: number): string | null {
  return EVENT_DATES[day - 1] ?? null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local wall-clock stamp, e.g. 20261114T100000 */
function stamp(date: Date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

/**
 * When a session actually happens.
 *
 * `baseDate` is a fallback for a session whose `day` has no entry in
 * `EVENT_DATES` — a schedule edited to add a day 3 before the date exists.
 * That case lands on day 1 rather than silently inventing a date by counting
 * forward, which is the arithmetic that put day 2 on the wrong Saturday.
 */
function sessionRange(session: Session, baseDate: string) {
  const dayDate = dateForDay(session.day) ?? baseDate;
  const [y, m, d] = dayDate.split("-").map(Number);
  const [hh, mm] = session.time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + session.durationMin * 60_000);
  return { start, end };
}

export function googleCalendarUrl(
  session: Session,
  locale: "fr" | "en",
  baseDate: string,
) {
  const { start, end } = sessionRange(session, baseDate);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title[locale],
    details: session.description[locale],
    location: session.room[locale],
    dates: `${stamp(start)}/${stamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** A minimal VEVENT, returned as a data URL for direct download. */
export function icsDataUrl(
  session: Session,
  locale: "fr" | "en",
  baseDate: string,
) {
  const { start, end } = sessionRange(session, baseDate);
  const escape = (s: string) =>
    s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DevFest Yaounde//EN",
    "BEGIN:VEVENT",
    `UID:${session.id}@devfest-yaounde`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(session.title[locale])}`,
    `DESCRIPTION:${escape(session.description[locale])}`,
    `LOCATION:${escape(session.room[locale])}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
