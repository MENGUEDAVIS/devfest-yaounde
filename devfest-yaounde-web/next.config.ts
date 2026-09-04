import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Security headers (A05 in .claude/skills/devfest-security).
 *
 * Set here rather than in the proxy so they apply to every response — API
 * routes and static assets included — not only to the pages the locale
 * matcher happens to touch.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No feature on this site needs any of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next's runtime needs inline/eval for hydration and dev refresh.
      isProduction
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // blob: is the DP generator's own canvas output; data: covers inlined
      // icons. Neither reaches the network.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase auth + database over HTTPS and realtime websockets.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // The PawaPay Payment Page is a full redirect, never an iframe.
      "frame-ancestors 'none'",
      "form-action 'self' https://*.pawapay.io",
      "base-uri 'self'",
      "object-src 'none'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "192.168.100.15", "10.34.2.185"],
  // The wall is on (ADR 0033). Only an explicit "0" turns it off — an empty
  // string copied from .env.example would otherwise keep it dark in production.
  env: {
    NEXT_PUBLIC_DP_GALLERY:
      process.env.NEXT_PUBLIC_DP_GALLERY === "0" ? "0" : "1",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
