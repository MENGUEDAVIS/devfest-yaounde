/**
 * Fixed-window rate limiting, counted in Postgres.
 *
 * Deliberately not an in-process Map: on Vercel each function instance gets
 * its own memory, so an in-process counter caps nothing once traffic spreads
 * across instances. The counter lives in the database via `bump_rate_limit`,
 * which is a single atomic upsert.
 *
 * Covers the surfaces the security skill calls out: discount-code entry and
 * checkout creation.
 */
import "server-only";
import { createAdminSupabase } from "@/lib/supabase/server";
import { clientIp } from "@/lib/pawapay/verify";

export interface RateLimitRule {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  /** Creating a checkout is cheap for us, expensive for PawaPay. */
  checkout: { bucket: "checkout", limit: 10, windowSeconds: 300 },
  /** Discount codes are guessable by design — this is the brute-force fence. */
  discountCode: { bucket: "discount-code", limit: 8, windowSeconds: 300 },
  /** Status polling from the return page. Generous: the page legitimately polls. */
  paymentStatus: { bucket: "payment-status", limit: 120, windowSeconds: 300 },
  /**
   * Door scanning. High enough for a real queue, low enough that a stolen
   * organiser session cannot walk the badge-code space.
   */
  checkIn: { bucket: "check-in", limit: 300, windowSeconds: 300 },
  /**
   * Community wall submissions, by IP. There is no account to attribute them
   * to (ADR 0015), so the address is all there is. Five an hour is generous
   * for a person and tedious for a script.
   */
  dpGallery: { bucket: "dp_gallery", limit: 5, windowSeconds: 3600 },
  /** Dashboard writes. Generous for a person, useless for a script. */
  adminWrite: { bucket: "admin-write", limit: 60, windowSeconds: 300 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * @param identifier stable per-caller key — a user id when signed in, else IP.
 *                   Prefer the user id: it survives a phone changing network.
 */
export async function rateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_bucket: rule.bucket,
    p_identifier: identifier,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    // Fail OPEN. A database hiccup must not block a paying attendee; the
    // real fences (auth, server-side pricing, the authoritative re-fetch)
    // are all still in place.
    console.warn("[rate-limit] counter unavailable, allowing through", {
      bucket: rule.bucket,
      error: error.message,
    });
    return { allowed: true, count: 0, limit: rule.limit, retryAfterSeconds: 0 };
  }

  const count = Number(data ?? 0);
  return {
    allowed: count <= rule.limit,
    count,
    limit: rule.limit,
    retryAfterSeconds: rule.windowSeconds,
  };
}

/** Identity for rate limiting: user id when we have one, client IP otherwise. */
export function rateLimitIdentity(
  userId: string | null,
  headers: Headers,
): string {
  if (userId) return `user:${userId}`;
  return `ip:${clientIp(headers) ?? "unknown"}`;
}
