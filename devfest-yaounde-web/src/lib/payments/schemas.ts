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
});

export const ticketCheckoutSchema = z.object({
  attendees: z.array(attendeeSchema).min(1).max(10),
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

export const shopCheckoutSchema = z.object({
  cart: z.array(cartLineSchema).min(1).max(20),
  discountCode: discountCodeSchema,
  contact: z.object({ email: emailSchema, phone: phoneSchema }),
  locale: localeSchema.default("fr"),
});

export const depositIdSchema = z.string().uuid();

export type TicketCheckoutInput = z.infer<typeof ticketCheckoutSchema>;
export type ShopCheckoutInput = z.infer<typeof shopCheckoutSchema>;
