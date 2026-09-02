"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isOrganiser: boolean;
}

/**
 * Who is signed in, from `/api/account/profile`.
 *
 * That endpoint rather than the Supabase client's own session because it also
 * answers `isOrganiser`, and because the server is the only honest source for
 * it: a client-side session object says what the browser believes, and the
 * server checks independently anyway.
 *
 * `loading` is deliberately distinct from `profile === null`. Rendering a
 * "sign in" prompt while the answer is still in flight would flash it at
 * someone who is already signed in.
 */
export function useSession() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/profile", { cache: "no-store" });
        if (cancelled) return;
        setProfile(res.ok ? await res.json() : null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}

/**
 * Start Google sign-in. Google is the only provider that is wired, and per
 * ADR 0014 a second one would split accounts — so nothing else is offered.
 *
 * `next` must be a path on this site; an absolute URL is discarded
 * server-side, so an open redirect cannot be smuggled through it.
 */
export async function signInWithGoogle(locale: string, next: string) {
  const supabase = createClientSupabase();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // /auth/callback lives outside [locale] because the redirect URI is
      // registered once with Google; the locale rides in the query string.
      redirectTo: `${location.origin}/auth/callback?locale=${locale}&next=${encodeURIComponent(next)}`,
    },
  });
}

/**
 * Sign out. POST, because a GET sign-out is triggerable by any `<img>` tag on
 * another site.
 *
 * It does NOT navigate: the caller does, through the router. Signing out
 * changes what the server renders, so the caller should also `router.refresh()`
 * — a client-side push alone would leave stale server-rendered markup showing
 * the person as signed in.
 */
export async function signOut(locale: string) {
  await fetch(`/auth/signout?locale=${locale}`, { method: "POST" });
}
