/**
 * Small pure helpers the CRM forms share.
 *
 * Here rather than inline in the components so they can be tested — a slug
 * and a clock calculation are exactly the things that look obvious and are
 * wrong at the edges.
 */

/** "Abdel Aziz MFOSSA" → "abdel-aziz-mfossa". Accents folded, not dropped. */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      // Strip the combining marks NFD just separated, so "Joël" becomes "joel"
      // rather than "jol".
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
  );
}

/**
 * A start time plus a duration, as a clock time.
 *
 * Wraps at midnight rather than returning "25:30" — a late workshop is the
 * one case somebody would notice, and the alternative is a time that no
 * clock shows.
 */
export function endsAt(time: string, durationMin: number): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const total = h * 60 + m + (Number.isFinite(durationMin) ? durationMin : 0);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(((total % 60) + 60) % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * West Africa Time, as a fixed offset.
 *
 * Cameroon is UTC+1 all year — no daylight saving, and none in its history
 * that a 2026 date could fall into. So the offset is a constant rather than a
 * timezone lookup, and the conversion below is exact instead of approximate.
 */
const WAT_OFFSET = "+01:00";

/**
 * An ISO instant as the wall-clock a `datetime-local` input wants, in WAT.
 *
 * Deliberately NOT the browser's timezone. The call for speakers closes at
 * "31 October, 23:59, Yaoundé" — that is the sentence on the public page and
 * in the organisers' heads. An organiser editing from another timezone should
 * still type the number they mean; converting to their local clock would make
 * them do the arithmetic and get it wrong in one direction or the other.
 */
export function isoToWatLocal(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  // Shift the instant by the offset, then read the UTC fields: the result is
  // the WAT wall clock, and `toISOString` gives it in exactly the shape the
  // input parses.
  return new Date(ms + 60 * 60 * 1000).toISOString().slice(0, 16);
}

/** The inverse: "2026-10-31T23:59" typed as WAT, back to an ISO instant. */
export function watLocalToIso(local: string): string | null {
  if (!local) return null;
  const ms = Date.parse(`${local}:00${WAT_OFFSET}`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
