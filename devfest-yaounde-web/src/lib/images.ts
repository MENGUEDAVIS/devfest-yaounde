/**
 * Whether `next/image` can be trusted with a URL.
 *
 * NOT a nicety. `next/image` THROWS on a host missing from `remotePatterns`,
 * and it throws while rendering — so one bad row takes the whole page down
 * with a 500 rather than showing one broken picture.
 *
 * And a bad row is reachable. The CSV import accepts a free-text `photoUrl`
 * (`SPEAKER_CSV_SPEC`), so somebody pasting a spreadsheet that links a
 * personal website is enough. Photos uploaded through the dashboard land on
 * our own bucket and are the normal case; this exists for the other one.
 *
 * Relative paths are ours and always fine. Everything else has to be HTTPS on
 * exactly the configured host — a null host refuses every remote URL, which
 * is the correct answer when nothing is configured rather than a wildcard
 * that turns the site into an open image proxy.
 *
 * A plain function in a plain module so it can be tested without dragging
 * React, `next/image` and the server-only content modules into the runner.
 */
export function canOptimise(url: string, host: string | null): boolean {
  if (url.startsWith("/")) return true;
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && hostname === host;
  } catch {
    return false;
  }
}

/**
 * The one remote host the optimiser is configured for.
 *
 * Public by definition — the same URL the browser already talks to for auth
 * and storage. Read once at module load; it cannot change at runtime.
 */
export const OPTIMISABLE_HOST: string | null = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();
