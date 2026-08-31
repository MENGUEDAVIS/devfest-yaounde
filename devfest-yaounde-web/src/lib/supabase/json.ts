/**
 * The JSONB boundary.
 *
 * Supabase's generated `Json` type demands an index signature, which our
 * domain interfaces (`PricedLine`, `AttendeeInput`, …) deliberately do not
 * have — a closed shape is the point of declaring them. They are still
 * perfectly valid JSON, so the mismatch is structural, not real.
 *
 * `toJson` is the one sanctioned place to cross that line. Keeping it in a
 * single named helper means the cast is greppable and explained, instead of
 * scattered as bare `as unknown as Json` at every call site.
 *
 * It is NOT a validation step: pass it something with a `Date`, a `Map` or an
 * `undefined` and Postgres will store whatever `JSON.stringify` makes of it.
 * Only pass plain data.
 */
import type { Json } from "./database.types";

export function toJson<T>(value: T): Json {
  return value as unknown as Json;
}
