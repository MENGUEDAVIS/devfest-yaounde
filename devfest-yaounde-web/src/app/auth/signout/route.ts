/**
 * POST /auth/signout
 *
 * POST rather than GET on purpose: a GET sign-out can be triggered by any
 * `<img src>` on another site, which is a nuisance CSRF. The session cookie
 * is cleared server-side so it is gone even if the tab never reloads.
 *
 * Outside `[locale]` for the same reason as the OAuth callback — it is a
 * mechanism, not a page.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  const requested = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requested as never)
    ? (requested as string)
    : routing.defaultLocale;

  // 303 so the browser follows with GET rather than repeating the POST.
  return NextResponse.redirect(`${request.nextUrl.origin}/${locale}`, 303);
}
