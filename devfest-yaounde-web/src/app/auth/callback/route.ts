/**
 * GET /auth/callback — Google OAuth landing (via Supabase).
 *
 * Deliberately OUTSIDE the [locale] segment: the redirect URI is registered
 * once with each provider and must not depend on which language the person
 * happened to be browsing in. The locale rides along in `next` instead.
 *
 * Open-redirect guard: `next` is only ever used as a PATH on our own origin.
 * An absolute URL in that parameter is discarded, not followed.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

function safeNextPath(raw: string | null, locale: string): string {
  if (!raw) return `/${locale}/account`;
  // Reject anything that could leave our origin: absolute URLs, protocol-
  // relative URLs, backslash tricks.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return `/${locale}/account`;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const requested = searchParams.get("locale");
  const locale = routing.locales.includes(requested as never)
    ? (requested as string)
    : routing.defaultLocale;

  const next = safeNextPath(searchParams.get("next"), locale);

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}?auth=missing_code`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // A05: the provider's message goes to the log, not to the URL bar.
    console.warn("[auth/callback] code exchange failed", error.message);
    return NextResponse.redirect(`${origin}/${locale}?auth=failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
