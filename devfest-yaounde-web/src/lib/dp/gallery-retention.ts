/**
 * How long a wall stays up.
 *
 * Decided 2026-09-03: **200 days**. Long enough that an edition's wall is
 * still there months later, short enough that faces from 2026 are not still
 * public when 2028 comes round.
 *
 * The purge removes the IMAGE and then the row, in that order. A row without
 * an object is untidy; an object without a row is a face still being served
 * by anyone who kept a signed URL — so the object goes first, always.
 *
 * It runs from the existing cron. See ADR 0026.
 */
import "server-only";
import { createAdminSupabase } from "@/lib/supabase/server";
import { removeCard } from "./gallery-server";

export const DEFAULT_RETENTION_DAYS = 200;

/** Bound the work per run so one sweep cannot run away with the schedule. */
const BATCH = 100;

export interface PurgeReport {
  expired: number;
  errors: number;
}

function retentionDays(): number {
  const raw = Number(process.env.DP_GALLERY_RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
}

/**
 * Delete every card past its retention, whatever its status.
 *
 * Pending and rejected rows are swept too. A card nobody ever reviewed is not
 * a reason to keep someone's photograph indefinitely — if it has sat unseen
 * for two hundred days, the answer is no.
 */
export async function purgeExpiredCards(): Promise<PurgeReport> {
  const report: PurgeReport = { expired: 0, errors: 0 };

  // Nothing to do when the wall was never switched on.
  if (process.env.NEXT_PUBLIC_DP_GALLERY !== "1") return report;

  const supabase = createAdminSupabase();
  const cutoff = new Date(
    Date.now() - retentionDays() * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("dp_cards")
    .select("id, storage_path")
    .lt("created_at", cutoff)
    .limit(BATCH);

  if (error) {
    console.error("[dp-gallery] retention query failed", error.message);
    report.errors++;
    return report;
  }

  for (const card of data ?? []) {
    try {
      await removeCard(card.storage_path);
      const { error: deleteError } = await supabase
        .from("dp_cards")
        .delete()
        .eq("id", card.id);
      if (deleteError) throw deleteError;
      report.expired++;
    } catch (err) {
      // Leave the row: the next run retries it. Losing track of a card whose
      // image is already gone would be worse than trying twice.
      console.error("[dp-gallery] could not purge", card.id, err);
      report.errors++;
    }
  }

  return report;
}
