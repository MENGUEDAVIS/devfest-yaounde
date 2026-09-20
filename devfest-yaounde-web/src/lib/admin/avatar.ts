/**
 * The signed-in organiser's Google profile picture (PHASE23 §D).
 *
 * Google sign-in already returns it: Supabase copies the OpenID `picture`
 * claim into `user_metadata` as both `avatar_url` and `picture`, under the
 * default `openid email profile` scopes the site already requests — checked
 * against the real accounts, no scope change needed.
 *
 * `user_metadata` is USER-WRITABLE, though: any signed-in person can call
 * `auth.updateUser({ data: { avatar_url: "…" } })` from their own browser. So
 * the value is never trusted as "the picture Google gave us" — it is only used
 * if it parses as an https URL on Google's own image host. Anything else
 * (another site, `http:`, `javascript:`, a lookalike such as
 * `lh3.googleusercontent.com.evil.example`, credentials smuggled before an
 * `@`) falls back to initials. Plain module, not `server-only`, so the rule
 * has one home and one test.
 */

const GOOGLE_IMAGE_HOST = /(^|\.)googleusercontent\.com$/;

/** The picture URL if it is safe to render, otherwise `null`. */
export function googleAvatarUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;

  for (const key of ["avatar_url", "picture"] as const) {
    const value = record[key];
    if (typeof value !== "string" || value.length > 500) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      GOOGLE_IMAGE_HOST.test(url.hostname)
    ) {
      return url.toString();
    }
  }
  return null;
}

/** The name Google supplied, trimmed, or `null`. Display only. */
export function googleDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  for (const key of ["full_name", "name"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 120);
    }
  }
  return null;
}
