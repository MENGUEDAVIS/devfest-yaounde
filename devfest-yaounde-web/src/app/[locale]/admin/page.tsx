import { AdminShell } from "@/components/admin/AdminShell";
import { loadAdminData } from "@/lib/admin/data";
import { loadSettings } from "@/lib/content/settings";
import { collectionCounts } from "@/lib/content/store";

/**
 * `/{locale}/admin` — the whole dashboard, in one server render.
 *
 * ONE ROUTE, not a route per view. The shell swaps views on the client, so
 * moving between Tickets and Orders is instant rather than a round trip —
 * which is what an internal tool being used at a door, on a phone, on venue
 * wifi, actually needs.
 *
 * The cost is that everything loads up front, so the reads are capped
 * (`LIST_CAP`) and the UI says "showing N of M" rather than implying it has
 * everything. For a first DevFest that ceiling is the whole dataset several
 * times over; past that these become paginated queries and the shell keeps
 * working.
 *
 * ENGLISH ONLY, deliberately. It is an internal tool, and translating it
 * would be effort spent on the one surface no attendee sees. The content it
 * DISPLAYS is still bilingual data, shown in both languages where it has two.
 */
export default async function AdminPage() {
  const [data, counts, settings] = await Promise.all([
    loadAdminData(),
    collectionCounts(),
    loadSettings(),
  ]);

  return (
    <AdminShell
      data={data}
      settings={settings}
      content={{
        speakers: counts.speakers,
        team: counts.team,
        sessions: counts.sessions,
        sponsors: counts.sponsors,
        faqs: counts.faqs,
        products: counts.products,
        tiers: counts["ticket-tiers"],
      }}
    />
  );
}
