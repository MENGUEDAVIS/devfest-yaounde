import { AdminShell } from "@/components/admin/AdminShell";
import { loadAdminData } from "@/lib/admin/data";
import speakers from "@/data/speakers.json";
import team from "@/data/team.json";
import sessions from "@/data/sessions.json";
import sponsors from "@/data/sponsors.json";
import faqs from "@/data/faqs.json";
import products from "@/data/products.json";
import tiers from "@/data/ticket-tiers.json";

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
  const data = await loadAdminData();

  return (
    <AdminShell
      data={data}
      content={{
        speakers: speakers.length,
        team: team.length,
        sessions: sessions.length,
        sponsors: sponsors.length,
        faqs: faqs.length,
        products: products.length,
        tiers: tiers.length,
      }}
    />
  );
}
