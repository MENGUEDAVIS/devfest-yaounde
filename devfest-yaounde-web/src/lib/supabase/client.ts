/**
 * Browser Supabase client — used by client components to start an OAuth
 * sign-in and to read the current session. Only ever sees the anon key, so
 * RLS is the thing standing between it and other people's data.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClientSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
