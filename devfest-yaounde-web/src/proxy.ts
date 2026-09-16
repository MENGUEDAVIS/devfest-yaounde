/**
 * Locale routing + Supabase session refresh.
 *
 * Two jobs, in this order:
 *
 *   1. next-intl decides the locale and may redirect/rewrite.
 *   2. Supabase refreshes the auth cookie onto whatever response came back.
 *      Without this, an expired access token is only noticed deep inside a
 *      Server Component, where cookies are read-only and cannot be rewritten.
 *
 * `/auth` is excluded from the matcher on purpose: the OAuth redirect URI is
 * registered once with Google, so it must not acquire a `/fr` prefix
 * depending on where the person happened to be browsing.
 *
 * `/og` is excluded for a related reason: it renders the social card image,
 * and it is fetched by crawlers and chat apps that follow no redirects and
 * carry no locale. Left in, every unfurl got a 307 to `/fr/og` and, from the
 * stricter clients, no image at all.
 *
 * `apple-icon` / `icon-192` / `icon-512` are excluded for the SAME reason,
 * found while wiring up the PWA manifest (PHASE22 §F): none of their
 * filenames contain a dot, so the matcher's "any path with a dot is a
 * static file" rule did not catch them the way it already does for
 * `icon.svg`, `robots.txt`, `sitemap.xml` and `manifest.webmanifest`.
 * `/apple-icon` had been silently 307-ing to `/fr/apple-icon` or
 * `/en/apple-icon` — neither of which exists, since the route lives
 * outside `[locale]` on purpose — meaning the iOS home-screen icon has
 * been a 404 since it was added. Verified directly: before this line, both
 * locale-prefixed paths 404, and `curl -I /apple-icon` returns a 307, not
 * the PNG.
 */
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "./lib/supabase/database.types";
import { routing } from "./i18n/routing";

const handleLocale = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleLocale(request) ?? NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet (a fresh clone, or a preview without secrets): the
  // informational pages must still render rather than 500.
  if (!url || !anonKey) return response;

  try {
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching getUser() is what triggers the refresh. The result is
    // deliberately unused here — route handlers re-read it themselves.
    await supabase.auth.getUser();
  } catch (err) {
    // A failed refresh means "signed out", not "site down".
    console.warn("[proxy] supabase session refresh failed", err);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|auth|og|apple-icon|icon-192|icon-512|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
