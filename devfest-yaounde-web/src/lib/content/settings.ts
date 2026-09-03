/**
 * Site settings — announcement + a few URLs.
 *
 * Null / missing row means "use the repo": `messages/*.json` for the
 * announcement, `src/lib/site-config.ts` for the URLs. Publishing from the
 * dashboard writes the single `site` row.
 */
import "server-only";
import {
  BEVY_URL,
  CODE_OF_CONDUCT_URL,
  PRIVACY_POLICY_URL,
} from "@/lib/site-config";
import { createAdminSupabase } from "@/lib/supabase/server";
import { toJson } from "@/lib/supabase/json";
import { settingsSchema, type SettingsWrite } from "./schemas";

import type { AdminSettings } from "@/lib/admin/shape";

export type SiteSettings = AdminSettings;

const REPO_DEFAULTS: SiteSettings = {
  announcement: null,
  privacyUrl: PRIVACY_POLICY_URL,
  cocUrl: CODE_OF_CONDUCT_URL,
  bevyUrl: BEVY_URL,
  source: "repo",
};

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function loadSettings(): Promise<SiteSettings> {
  if (!supabaseConfigured()) return REPO_DEFAULTS;

  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from("site_settings")
      .select("announcement, privacy_url, coc_url, bevy_url")
      .eq("id", "site")
      .maybeSingle();
    if (error || !data) return REPO_DEFAULTS;

    const announcement =
      data.announcement &&
      typeof data.announcement === "object" &&
      data.announcement !== null &&
      "fr" in data.announcement &&
      "en" in data.announcement
        ? {
            fr: String(
              (data.announcement as { fr?: unknown }).fr ?? "",
            ),
            en: String(
              (data.announcement as { en?: unknown }).en ?? "",
            ),
          }
        : null;

    return {
      announcement,
      privacyUrl: data.privacy_url || PRIVACY_POLICY_URL,
      cocUrl: data.coc_url || CODE_OF_CONDUCT_URL,
      bevyUrl: data.bevy_url || BEVY_URL,
      source: "database",
    };
  } catch (err) {
    console.warn("[settings] store unavailable, using repo", err);
    return REPO_DEFAULTS;
  }
}

export async function saveSettings(
  input: SettingsWrite,
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_body" };
  }

  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert({
    id: "site",
    announcement: parsed.data.announcement
      ? toJson(parsed.data.announcement)
      : null,
    privacy_url: parsed.data.privacyUrl || null,
    coc_url: parsed.data.cocUrl || null,
    bevy_url: parsed.data.bevyUrl || null,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  });

  if (error) {
    console.error("[settings] write failed", error.message);
    return { ok: false, error: "server_error" };
  }
  return { ok: true };
}
