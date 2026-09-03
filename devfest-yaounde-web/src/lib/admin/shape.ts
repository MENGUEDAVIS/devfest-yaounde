/**
 * The dashboard's data shape, and nothing that can touch a database.
 *
 * Split from `data.ts` because that module is `server-only` and pulls in the
 * Supabase service-role client. A view importing a plain CONSTANT from it —
 * `LIST_CAP`, to print "showing 500 of 812" — was enough to drag the whole
 * server client into the browser bundle, which the build rightly refused.
 * Types alone would have been fine, since they are erased; a value is not.
 */
/**
 * How many rows a list view loads.
 *
 * The dashboard is one server render, so this is a real ceiling rather than a
 * page size — and the UI says "showing N of M" rather than implying it has
 * everything. For a first DevFest this is the whole dataset several times
 * over; past that, these become paginated queries.
 */
export const LIST_CAP = 500;

export interface AdminTicket {
  id: string;
  badgeCode: string;
  attendeeName: string;
  attendeeEmail: string;
  tierId: string;
  apparelSize: string | null;
  checkedInAt: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  fulfilment: unknown;
  items: {
    name: string;
    quantity: number;
    unitAmount: number;
    variant: unknown;
  }[];
}

export interface AdminTransaction {
  depositId: string;
  kind: string;
  status: string;
  chargedAmount: number;
  netAmount: number;
  discountCode: string | null;
  discountAmount: number | null;
  currency: string;
  failureCode: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
}

export interface AdminDiscount {
  code: string;
  kind: string;
  value: number;
  appliesTo: string;
  active: boolean;
  redeemedCount: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
}

export interface AdminSettings {
  announcement: { fr: string; en: string } | null;
  privacyUrl: string;
  cocUrl: string;
  bevyUrl: string;
  source: "database" | "repo";
}

export interface AdminData {
  organiserEmail: string | null;
  counts: {
    paidTickets: number;
    checkedIn: number;
    orders: number;
    settledRevenue: number;
    wallPending: number;
    wallApproved: number;
    users: number;
  };
  tickets: { rows: AdminTicket[]; total: number };
  orders: { rows: AdminOrder[]; total: number };
  transactions: { rows: AdminTransaction[]; total: number };
  users: { rows: AdminUser[]; total: number };
  discounts: AdminDiscount[];
  wallEnabled: boolean;
}
