import type { Session } from "@/data/types";

/**
 * Add-to-calendar links (PAGES.md §3).
 *
 * The event date is NOT confirmed yet — `home.hero.dates` still reads "dates
 * to be announced". Rather than invent one, sessions carry only a time of
 * day, and these helpers take an explicit `baseDate`. Until a real date is
 * set, `EVENT_BASE_DATE` is null and the calendar UI is hidden entirely
 * rather than exporting an event on a made-up day.
 *
 * To switch it on: set EVENT_BASE_DATE to the real first-day date
 * (YYYY-MM-DD). Day 2 is derived as the following day.
 */
export const EVENT_BASE_DATE: string | null = null;

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

function sessionRange(session: Session, baseDate: string) {
  const [y, m, d] = baseDate.split("-").map(Number);
  const [hh, mm] = session.time.split(":").map(Number);
  // day 1 = baseDate, day 2 = next day, etc.
  const start = new Date(y, m - 1, d + (session.day - 1), hh, mm);
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
