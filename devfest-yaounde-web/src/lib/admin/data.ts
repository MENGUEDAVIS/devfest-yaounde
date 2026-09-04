import "server-only";
import { createAdminSupabase } from "@/lib/supabase/server";
import { currentOrganiser } from "@/lib/security/organisers";
import { signedUrl } from "@/lib/dp/gallery-server";

/**
 * Everything the dashboard reads, in one place, behind one gate.
 *
 * EVERY function here re-checks `currentOrganiser()` itself rather than
 * trusting that a layout already did. A layout gate protects the page someone
 * navigates to; it does not protect a function that some future route imports
 * without thinking. The check is a table lookup on a session that is already
 * in memory, so the cost of doing it twice is not worth the risk of assuming.
 *
 * These are READS ONLY. Every write the dashboard performs goes through an
 * endpoint that already exists and does its own organiser check — see
 * docs/backend/ADMIN-CAPABILITIES.md for why no new route was added.
 */

export class NotAnOrganiser extends Error {}

async function gate() {
  const organiser = await currentOrganiser();
  if (!organiser) throw new NotAnOrganiser();
  return organiser;
}

export * from "./shape";
import type { AdminData } from "./shape";
import { LIST_CAP } from "./shape";

export async function loadAdminData(): Promise<AdminData> {
  const organiser = await gate();
  const db = createAdminSupabase();

  const [tickets, orders, intents, users, discounts] = await Promise.all([
    db
      .from("tickets")
      .select(
        "id, badge_code, attendee_name, attendee_email, tier_id, apparel_size, checked_in_at, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(LIST_CAP),
    db
      .from("orders")
      .select(
        "id, status, total_amount, currency, created_at, fulfilment, order_items(name_snapshot, quantity, unit_amount, variant)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(LIST_CAP),
    db
      .from("payment_intents")
      .select(
        "deposit_id, kind, status, charged_amount, net_amount, discount_code, discount_amount, currency, failure_code, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(LIST_CAP),
    db
      .from("profiles")
      .select("id, display_name, email, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(LIST_CAP),
    db
      .from("discount_codes")
      .select(
        "code, kind, value, applies_to, active, redeemed_count, max_redemptions, expires_at",
      )
      .order("code"),
  ]);

  const wallEnabled = process.env.NEXT_PUBLIC_DP_GALLERY === "1";
  let wallPending = 0;
  let wallApproved = 0;
  let wallReports: AdminData["wallReports"] = [];
  let wallCards: AdminData["wallCards"] = [];
  if (wallEnabled) {
    const [pending, approved, reports] = await Promise.all([
      db
        .from("dp_cards")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("dp_cards")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      db
        .from("dp_card_reports")
        .select("id, card_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    wallPending = pending.count ?? 0;
    wallApproved = approved.count ?? 0;

    const reportRows = reports.data ?? [];
    const cardIds = [...new Set(reportRows.map((row) => row.card_id))];
    const cards =
      cardIds.length === 0
        ? []
        : ((
            await db
              .from("dp_cards")
              .select("id, nickname, status, storage_path")
              .in("id", cardIds)
          ).data ?? []);
    const byId = new Map(cards.map((card) => [card.id, card]));
    wallReports = await Promise.all(
      reportRows.map(async (row) => {
        const card = byId.get(row.card_id);
        return {
          id: row.id,
          cardId: row.card_id,
          nickname: card?.nickname ?? "unknown",
          status: card?.status ?? "gone",
          imageUrl: card ? await signedUrl(card.storage_path) : null,
          createdAt: row.created_at,
        };
      }),
    );

    const reportCount = new Map<string, number>();
    for (const row of reportRows) {
      reportCount.set(row.card_id, (reportCount.get(row.card_id) ?? 0) + 1);
    }
    const { data: stored } = await db
      .from("dp_cards")
      .select("id, nickname, theme, visible, status, storage_path, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    wallCards = await Promise.all(
      (stored ?? []).map(async (card) => ({
        id: card.id,
        nickname: card.nickname,
        theme: card.theme,
        visible: card.visible,
        status: card.status,
        imageUrl: await signedUrl(card.storage_path),
        createdAt: card.created_at,
        reportCount: reportCount.get(card.id) ?? 0,
      })),
    );
  }

  const ticketRows = tickets.data ?? [];
  const intentRows = intents.data ?? [];

  return {
    organiserEmail: organiser.email,
    counts: {
      paidTickets: tickets.count ?? ticketRows.length,
      checkedIn: ticketRows.filter((t) => t.checked_in_at).length,
      orders: orders.count ?? 0,
      /*
       * `activated` IS the settled state. There is no "paid" status — the
       * intent moves to `activated` inside `apply_paid_deposit`, once the
       * money landed AND the tickets or order were created. Filtering on
       * "paid" (the obvious guess) matches nothing, so this headline would
       * have read 0 XAF forever and looked plausible doing it.
       *
       * `net_amount` rather than `charged_amount`: what the chapter actually
       * received, after the discount.
       */
      settledRevenue: intentRows
        .filter((i) => i.status === "activated")
        .reduce((sum, i) => sum + (i.net_amount ?? 0), 0),
      wallPending,
      wallApproved,
      users: users.count ?? 0,
    },
    tickets: {
      total: tickets.count ?? ticketRows.length,
      rows: ticketRows.map((t) => ({
        id: t.id,
        badgeCode: t.badge_code,
        attendeeName: t.attendee_name,
        attendeeEmail: t.attendee_email,
        tierId: t.tier_id,
        apparelSize: t.apparel_size,
        checkedInAt: t.checked_in_at,
        createdAt: t.created_at,
      })),
    },
    orders: {
      total: orders.count ?? 0,
      rows: (orders.data ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.total_amount,
        currency: o.currency,
        createdAt: o.created_at,
        fulfilment: o.fulfilment,
        items: (o.order_items ?? []).map((i) => ({
          // `name_snapshot` is a JSON column (it stores the bilingual name at
          // the time of sale), so it needs coercing before it reaches a table.
          name:
            typeof i.name_snapshot === "string"
              ? i.name_snapshot
              : JSON.stringify(i.name_snapshot),
          quantity: i.quantity,
          unitAmount: i.unit_amount,
          variant: i.variant,
        })),
      })),
    },
    transactions: {
      total: intents.count ?? intentRows.length,
      rows: intentRows.map((i) => ({
        depositId: i.deposit_id,
        kind: i.kind,
        status: i.status,
        chargedAmount: i.charged_amount,
        netAmount: i.net_amount,
        discountCode: i.discount_code,
        discountAmount: i.discount_amount,
        currency: i.currency,
        failureCode: i.failure_code,
        createdAt: i.created_at,
      })),
    },
    users: {
      total: users.count ?? 0,
      rows: (users.data ?? []).map((u) => ({
        id: u.id,
        displayName: u.display_name,
        email: u.email,
        createdAt: u.created_at,
      })),
    },
    discounts: (discounts.data ?? []).map((d) => ({
      code: d.code,
      kind: d.kind,
      value: d.value,
      appliesTo: d.applies_to,
      active: d.active,
      redeemedCount: d.redeemed_count,
      maxRedemptions: d.max_redemptions,
      expiresAt: d.expires_at,
    })),
    wallEnabled,
    wallReports,
    wallCards,
  };
}
