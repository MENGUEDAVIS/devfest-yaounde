/**
 * The editorial store.
 *
 * A collection WITH a row in `editorial_documents` is the live source. A
 * collection without one still comes from `src/data/*.json` — those files
 * are the seed, and they keep the site rendering on a fresh clone with no
 * database. Publishing from the dashboard writes the row; after that the
 * JSON file is no longer read for that collection.
 *
 * Prices live here too. Checkout calls `loadTiers` / `loadProducts`, never
 * the request body. See ADR 0031.
 */
import "server-only";
import { cache } from "react";
import speakersJson from "@/data/speakers.json";
import teamJson from "@/data/team.json";
import sessionsJson from "@/data/sessions.json";
import sponsorsJson from "@/data/sponsors.json";
import faqsJson from "@/data/faqs.json";
import productsJson from "@/data/products.json";
import tiersJson from "@/data/ticket-tiers.json";
import quotesJson from "@/data/quotes.json";
import statsJson from "@/data/stats.json";
import pastEditionsJson from "@/data/past-editions.json";
import type {
  FaqItem,
  PastEditionPhoto,
  Product,
  Quote,
  Session,
  Speaker,
  Sponsor,
  Stat,
  TeamMember,
  TicketTier,
} from "@/data/types";
import { createAdminSupabase } from "@/lib/supabase/server";
import { toJson } from "@/lib/supabase/json";
import { COLLECTIONS, collectionSchemas, type CollectionId } from "./schemas";

export type { CollectionId };
export { COLLECTIONS, isCollectionId } from "./schemas";

const FALLBACKS: Record<CollectionId, unknown> = {
  speakers: speakersJson,
  team: teamJson,
  sessions: sessionsJson,
  sponsors: sponsorsJson,
  faqs: faqsJson,
  products: productsJson,
  "ticket-tiers": tiersJson,
  quotes: quotesJson,
  stats: statsJson,
  "past-editions": pastEditionsJson,
};

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Per-request memo — see the note on `loadSettings`. Several pages read the
 * same collection twice (the speaker list is both the grid and the count the
 * call-for-speakers view decides on), and this makes that one query.
 */
export const loadCollection = cache(readCollection) as <T>(
  id: CollectionId,
) => Promise<T>;

async function readCollection<T>(id: CollectionId): Promise<T> {
  const fallback = FALLBACKS[id] as T;
  if (!supabaseConfigured()) return fallback;

  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from("editorial_documents")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn("[content] read failed, using repo file", id, error.message);
      return fallback;
    }
    if (data == null) return fallback;
    return data.payload as T;
  } catch (err) {
    console.warn("[content] store unavailable, using repo file", id, err);
    return fallback;
  }
}

export async function saveCollection(
  id: CollectionId,
  payload: unknown,
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = collectionSchemas[id].safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first
        ? `${first.path.join(".") || "payload"}: ${first.message}`
        : "invalid payload",
    };
  }

  const db = createAdminSupabase();
  const { error } = await db.from("editorial_documents").upsert({
    id,
    payload: toJson(parsed.data),
    updated_at: new Date().toISOString(),
    updated_by: actor,
  });

  if (error) {
    console.error("[content] write failed", id, error.message);
    return { ok: false, error: "server_error" };
  }
  return { ok: true };
}

export async function collectionCounts(): Promise<
  Record<CollectionId, number>
> {
  const entries = await Promise.all(
    COLLECTIONS.map(async (id) => {
      const rows = await loadCollection<unknown[]>(id);
      return [id, Array.isArray(rows) ? rows.length : 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CollectionId, number>;
}

export const getSpeakers = () => loadCollection<Speaker[]>("speakers");
export const getTeam = () => loadCollection<TeamMember[]>("team");
export const getSessions = () => loadCollection<Session[]>("sessions");
export const getSponsors = () => loadCollection<Sponsor[]>("sponsors");
export const getFaqs = () => loadCollection<FaqItem[]>("faqs");
export const getProducts = () => loadCollection<Product[]>("products");
export const getTiers = () => loadCollection<TicketTier[]>("ticket-tiers");
export const getQuotes = () => loadCollection<Quote[]>("quotes");
export const getStats = () => loadCollection<Stat[]>("stats");
export const getPastEditions = () =>
  loadCollection<PastEditionPhoto[]>("past-editions");
