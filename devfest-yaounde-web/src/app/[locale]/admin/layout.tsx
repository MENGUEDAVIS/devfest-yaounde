import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentOrganiser } from "@/lib/security/organisers";

/**
 * Never indexed, never followed, never in the sitemap, never linked from the
 * public site. `noindex` is not the access control — the gate below is — but
 * an admin URL in a search result is an invitation to go looking.
 */
export const metadata: Metadata = {
  /*
   * NO TITLE ANYWHERE IN THIS ROUTE TREE.
   *
   * Next resolves a route's metadata BEFORE rendering it, so a title on the
   * layout — or on the page — was serialised into the 404's flight payload as
   * "Admin · DevFest Yaoundé". That confirms to anyone probing that the route
   * exists, which is the exact thing returning a 404 rather than a 403 was
   * meant to avoid. Moving it to the page fixed the visible <title> tag and
   * left it in the payload; the only way to keep it out of both is to not
   * declare it statically at all.
   *
   * `AdminShell` sets `document.title` on mount instead, which runs only for
   * someone who got past this gate.
   *
   * `robots` stays: harmless on a 404, and must not be missed on the real
   * thing.
   */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Nothing here is static. The gate reads a session cookie, so a cached render
 * would be a render of somebody else's authorisation.
 */
export const dynamic = "force-dynamic";

/**
 * THE GATE.
 *
 * Server-side, using the same `currentOrganiser()` the check-in and order
 * endpoints already use: a Supabase session resolved on the server, then a
 * membership lookup in `organisers` through the service role, failing closed
 * on error. There is no client-side `isAdmin` anywhere in this tree, because
 * there is nothing for one to do.
 *
 * A non-organiser gets `notFound()`, not a 403. A 403 confirms the route
 * exists and that they simply lack the role, which is a small gift to someone
 * probing; a 404 is what every other unknown path returns.
 *
 * This gate protects PAGES. It is deliberately not the only check: every
 * function in `lib/admin/data.ts` re-runs it, because a layout cannot protect
 * a function some future route imports without thinking.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organiser = await currentOrganiser();
  if (!organiser) notFound();
  return <div data-admin>{children}</div>;
}
