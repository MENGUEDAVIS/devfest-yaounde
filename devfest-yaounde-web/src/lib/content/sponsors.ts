import type { SponsorCallSettings } from "@/lib/admin/shape";
import type { Sponsor } from "@/data/types";

/**
 * How the sponsor strip decides what to draw.
 *
 * Pure, for the same reason `cfs.ts` is: `now` is an argument, so the close
 * date is testable without waiting for it, and the strip and the admin
 * preview reach the same answer because they call the same function.
 */

/**
 * How many logo slots the strip lays out.
 *
 * Six because the strip has to read as a ROW at a glance — three looks like
 * a mistake and ten makes each seat too small to hold a logo legibly. Filled
 * from the left; whatever is left over stays visibly, deliberately empty.
 */
export const SPONSOR_SEATS = 6;

export type SponsorSeat =
  { kind: "filled"; sponsor: Sponsor } | { kind: "empty"; index: number };

/**
 * Confirmed sponsors, then the seats still going.
 *
 * The empty ones are the point, not padding. A strip that hides itself until
 * somebody signs tells a visiting company nothing; a strip with three logos
 * and three open seats tells them there is room, which is the entire ask.
 *
 * More sponsors than seats is not an error — every one of them is shown, and
 * the strip scrolls instead of laying out.
 */
export function sponsorSeats(
  sponsors: readonly Sponsor[],
  total: number = SPONSOR_SEATS,
): SponsorSeat[] {
  const filled: SponsorSeat[] = sponsors.map((sponsor) => ({
    kind: "filled",
    sponsor,
  }));
  const empties = Math.max(0, total - sponsors.length);
  return [
    ...filled,
    ...Array.from({ length: empties }, (_, index) => ({
      kind: "empty" as const,
      index,
    })),
  ];
}

/**
 * Whether the "become a sponsor" ask is up.
 *
 * The switch is checked before the date, and both have to agree. Turning it
 * off is how an organiser takes the ask down early — mid-negotiation, or when
 * the deck is out of date — and a deadline that has not arrived yet must not
 * quietly override that.
 *
 * No URL means no ask, because there would be nothing behind the button.
 */
export function sponsorCallOpen(
  call: SponsorCallSettings,
  now: Date = new Date(),
): boolean {
  if (!call.enabled) return false;
  if (!call.prospectusUrl?.trim()) return false;
  if (!call.closesAt) return true;
  const closes = Date.parse(call.closesAt);
  // An unparseable date is not a closed door: it is a typo, and hiding the
  // ask because of one would be a silent failure nobody would think to look
  // for.
  return Number.isNaN(closes) || now.getTime() < closes;
}
