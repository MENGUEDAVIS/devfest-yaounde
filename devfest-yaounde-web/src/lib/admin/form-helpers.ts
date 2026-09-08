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
