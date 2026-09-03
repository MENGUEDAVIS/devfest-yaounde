/**
 * Server-side request validation (A03).
 *
 * Client-side validation is good UX and nothing more — every checkout body is
 * parsed here before a single value is read. Note what is NOT in these
 * schemas: prices, totals, user ids. Those are derived server-side, so there
 * is no field for a client to lie in.
 */
import { z } from "zod";

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** Catalog ids are slugs we author; anything else is a probe. */
const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "invalid id");

const localeSchema = z.enum(["fr", "en"]);

/**
 * Attendee names land on a printed badge and inside an email. Control
 * characters are rejected by codepoint rather than by regex escape — same
 * result, but it stays readable and cannot be mangled by a bad copy-paste.
 */
function hasControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) return true;
  }
  return false;
}

const attendeeNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => !hasControlCharacters(value), "invalid characters");

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Cameroon MSISDN as PawaPay expects it: country code, no plus, no spaces.
 * Optional — the Payment Page collects it if we do not.
 */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^237[0-9]{9}$/, "expected a Cameroon number as 237XXXXXXXXX")
  .optional();

const discountCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9-]+$/, "invalid discount code")
  .optional();

export const attendeeSchema = z.object({
  tierId: idSchema,
  name: attendeeNameSchema,
  email: emailSchema,
  apparelSize: z.enum(APPAREL_SIZES).optional(),
  /**
   * The buyer kept this one for themselves.
   *
   * Not a security claim — it grants nothing. It answers a question the
   * server could not otherwise answer: among the tickets someone paid for,
   * which is theirs to use. `tickets.user_id` already says who paid.
   */
  isSelf: z.boolean().optional(),
});

export const ticketCheckoutSchema = z.object({
  attendees: z
    .array(attendeeSchema)
    .min(1)
    .max(10)
    // You can only be one person. The UI already enforces this by unsetting
    // the others, so a body with two is either a bug or hand-written.
    .refine(
      (list) => list.filter((a) => a.isSelf).length <= 1,
      "at most one attendee can be the buyer",
    ),
  /**
   * The refund acknowledgment. A literal `true` — anything else is refused.
   *
   * Only the FACT is taken from the client. The wording and the timestamp are
   * resolved server-side (`terms.ts`), because a body that supplies its own
   * text could record agreement to something never shown.
   */
  acceptedTerms: z.literal(true),

  discountCode: discountCodeSchema,
  contact: z.object({ email: emailSchema, phone: phoneSchema }),
  locale: localeSchema.default("fr"),
});

export const cartLineSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(10),
  variant: z
    .object({
      size: z.string().trim().max(16).optional(),
      color: z.string().trim().max(32).optional(),
    })
    .optional(),
});

/**
 * What the buyer asks for. A PREFERENCE and a note — not a shipping engine:
 * zones, fees and pickup windows are still undecided (PAGES.md §11), and the
 * screen still says the team coordinates afterwards. Recording it here just
 * saves someone having to ask every buyer the same two questions.
 *
 * `shipping` rather than `delivery` to match what organisers already write
 * through PATCH /api/orders/:id/status.
 */
export const fulfilmentRequestSchema = z.object({
  method: z.enum(["pickup", "shipping"]),
  /** Free text: a neighbourhood, a landmark, when they are around. */
  note: z.string().trim().max(300).optional(),
});

export const shopCheckoutSchema = z.object({
  cart: z.array(cartLineSchema).min(1).max(20),
  fulfilment: fulfilmentRequestSchema.optional(),
  /**
   * The refund acknowledgment. A literal `true` — anything else is refused.
   *
   * Only the FACT is taken from the client. The wording and the timestamp are
   * resolved server-side (`terms.ts`), because a body that supplies its own
   * text could record agreement to something never shown.
   */
  acceptedTerms: z.literal(true),

  discountCode: discountCodeSchema,
  contact: z.object({ email: emailSchema, phone: phoneSchema }),
  locale: localeSchema.default("fr"),
});

export const depositIdSchema = z.string().uuid();

export type TicketCheckoutInput = z.infer<typeof ticketCheckoutSchema>;
export type ShopCheckoutInput = z.infer<typeof shopCheckoutSchema>;
