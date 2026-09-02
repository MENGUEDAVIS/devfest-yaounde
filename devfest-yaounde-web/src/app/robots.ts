import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * Crawlers are welcome everywhere except the two places that are personal or
 * meaningless out of context — the same two the sitemap leaves out and
 * `pageMetadata` marks `noindex`.
 *
 * `/api` and `/auth` are disallowed because they are endpoints, not pages: a
 * crawler following one achieves nothing and spends the rate limit.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/fr/account",
        "/en/account",
        "/fr/payments/",
        "/en/payments/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
