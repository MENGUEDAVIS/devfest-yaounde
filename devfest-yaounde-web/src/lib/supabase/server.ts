/**
 * Supabase clients for server code.
 *
 * Two of them, and the difference matters:
 *
 *   createServerSupabase()  — acts AS THE SIGNED-IN USER. RLS applies, so a
 *                             query can only ever return that person's rows.
 *                             Use this for anything reading user data.
 *
 *   createAdminSupabase()   — service role, BYPASSES RLS entirely. Only for
 *                             writes the user is not allowed to make
 *                             themselves: creating payment intents,
 *                             fulfilling a deposit, reading discount codes.
 *                             Never reachable from a client component, and
 *                             never used to serve a user-supplied id without
 *                             an explicit ownership check.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

/** Session-bound client. Every read through this is filtered by RLS. */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled in src/proxy.ts, so this is safe.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS — treat every call as privileged.
 * Throws if imported where the key is absent rather than silently degrading.
 */
export function createAdminSupabase() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** The signed-in user, or null. Never trust a user id from a request body. */
export async function currentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
