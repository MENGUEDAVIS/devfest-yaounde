/**
 * Data shapes for src/data/*.json — mirrors the devfest-content-model skill.
 * See .claude/skills/devfest-content-model/SKILL.md for the source of truth.
 */

export type LocalizedString = { fr: string; en: string };

export interface Speaker {
  id: string;
  name: string;
  role: LocalizedString;
  company: string;
  photoUrl: string;
  bio: LocalizedString;
  /** Primary track — drives the /speakers filter. */
  track: LocalizedString;
  /** Event day they appear on — drives the /speakers filter. */
  day: number;
  sessionIds: string[];
  social?: { x?: string; linkedin?: string; website?: string };
  /** Casual interview-style question shown in the detail reveal. */
  icebreakerQuestion: LocalizedString;
  /** Their short answer to it — brand-voice personality, not a data row. */
  icebreakerAnswer: LocalizedString;
  /** Optional short, shareable funny note. Omit rather than leaving blank. */
  funnyMoment?: LocalizedString;
  /** true = shown in the Home preview slider. */
  featured?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  /**
   * Personality-forward one-liner, not a formal bio (PAGES.md §6).
   *
   * Optional: a real organiser's words are theirs to write. See the note on
   * `teamSchema` — the alternative was inventing a sentence and putting a
   * named person's face next to it.
   */
  oneLiner?: LocalizedString;
  /**
   * What they actually do for the event (Organising, Sponsoring, Ushering,
   * Design, Logistics, Programme…). This doubles as the grouping/filter axis
   * on /team — we group by contribution rather than an invented sub-team org
   * chart, which was never confirmed. See docs/decisions/0010-team-grouping.md.
   */
  contribution: LocalizedString;
  photoUrl: string;
  social?: { x?: string; linkedin?: string; website?: string };
  /** Casual interview-style question shown in the detail reveal. Optional. */
  icebreakerQuestion?: LocalizedString;
  /** Their short answer to it. Optional, for the same reason. */
  icebreakerAnswer?: LocalizedString;
  /** Optional short, shareable funny note. */
  funnyMoment?: LocalizedString;
  /** true = rendered in the Alumni / Past Organizers section. */
  alumni?: boolean;
  /** Year(s) they organised — alumni only. */
  years?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tier?: "platinum" | "gold" | "silver" | "community";
  websiteUrl?: string;
}

export interface Stat {
  id: string;
  value: number;
  suffix?: string;
  label: LocalizedString;
}

export interface Quote {
  id: string;
  text: LocalizedString;
  author: string;
  role?: LocalizedString;
}

export interface PastEditionPhoto {
  id: string;
  imageUrl: string;
  alt: LocalizedString;
  year?: number;
}

/**
 * A schedule session. Shaped so the Home preview and the full /schedule
 * route share one component and one record type (devfest-content-model).
 */
export type SessionKind = "talk" | "workshop" | "panel" | "break";

export interface Session {
  id: string;
  /** "HH:mm" — local event time. */
  time: string;
  /** Minutes; drives the displayed duration. */
  durationMin: number;
  day: number;
  kind: SessionKind;
  title: LocalizedString;
  description: LocalizedString;
  track: LocalizedString;
  room: LocalizedString;
  /** Free-form tags rendered as Badges. */
  tags: LocalizedString[];
  /** e.g. "bring a laptop" — only rendered when present. */
  bring?: LocalizedString;
  /** e.g. "we provide the boards" — only rendered when present. */
  provided?: LocalizedString;
  /** Ids into speakers.json; empty for breaks. */
  speakerIds: string[];
}

export interface FaqItem {
  id: string;
  category: "general" | "tickets" | "venue" | "shop" | "code-of-conduct";
  question: LocalizedString;
  answer: LocalizedString;
  /**
   * Optional call to action on the answer (PHASE10 §8) — "See ticket tiers",
   * "Read the code of conduct". Per-ITEM rather than per-category: the useful
   * next step differs between two questions in the same category, and the
   * old category-wide link appended "See tickets" to answers that had
   * nothing to do with buying one.
   *
   * `href` is an internal route (passed to the locale-aware `Link`) unless
   * `external` is set, in which case it is a plain absolute URL.
   */
  cta?: {
    label: LocalizedString;
    href: string;
    external?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Commerce (feat/tickets-flow, feat/shop-flow)
//
// Prices live here, in JSON, and NOWHERE else. The checkout routes recompute
// every total from these files — a price arriving in a request body is always
// ignored. See docs/decisions/0013-payments-pawapay.md.
// ---------------------------------------------------------------------------

/** Apparel sizes offered on tiers/products that include clothing. */
export type ApparelSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface TicketTier {
  id: string;
  /** Proper-noun tier name, rendered mono-tag style. Language-neutral. */
  name: string;
  /**
   * Optional sub-title beside the name ("Free pass", "Student pass"). Empty
   * strings for tiers whose name says enough on its own.
   */
  label?: LocalizedString;
  /** Whole XAF. 0 = free tier, which skips the payment provider entirely. */
  priceXAF: number;
  /**
   * True when this tier is NOT sold here at all: the RSVP is delegated to the
   * community platform, which already enforces one free RSVP per person.
   * Such a tier shows an outbound CTA instead of a quantity selector, and
   * never touches checkout or sign-in.
   */
  rsvpExternal?: boolean;
  /**
   * What comes in the box, for the swag preview. Ordered biggest-first;
   * higher tiers list more. Display only — the server does not read it.
   */
  swag?: LocalizedString[];
  description: LocalizedString;
  perks: LocalizedString[];
  /** When true, attendee details must collect an apparel size. */
  includesApparel: boolean;
  /** Omit for unlimited. Checked server-side at checkout. */
  quantityAvailable?: number;
  /** Hidden from the tier list when false — kept so past tiers stay resolvable. */
  onSale: boolean;
}

export type ProductStatus =
  "pre-order" | "in-stock" | "venue-only" | "sold-out";

export interface Product {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  priceXAF: number;
  images: string[];
  variants?: { size?: ApparelSize[]; color?: string[] };
  /**
   * Per-combination stock. Omit the whole field for unlimited, and omit a
   * single combination to leave that one unlimited.
   *
   * Declared here, counted in the database — the same split as ticket tiers:
   * an organiser changes a number in this file, and the server counts what
   * has actually been sold against it. See ADR 0024.
   */
  stock?: Array<{ size?: string; color?: string; quantity: number }>;
  /** Always paired with a visible text label in the UI, never colour alone. */
  status: ProductStatus;
}

/** One chosen product + variant + quantity, as sent by the shop checkout. */
export interface CartLine {
  productId: string;
  quantity: number;
  variant?: { size?: string; color?: string };
}

/** One attendee on a ticket order. Apparel size only for apparel tiers. */
export interface AttendeeInput {
  tierId: string;
  name: string;
  email: string;
  apparelSize?: ApparelSize;
  /** The buyer kept this one. Recorded on the ticket — see ADR 0025. */
  isSelf?: boolean;
}

/**
 * A priced basket, computed server-side. `net` is what the community actually
 * banks once the discount is applied; `charged` is what the buyer pays. They
 * differ only when a discount is in play, but both are persisted so the
 * callback can check the charged figure while accounting reads the net one.
 */
export interface PricedBasket {
  lines: PricedLine[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  charged: number;
  net: number;
  currency: "XAF";
}

export interface PricedLine {
  /** Tier id for tickets, product id for shop. */
  productId: string;
  name: LocalizedString;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  variant?: { size?: string; color?: string };
}
