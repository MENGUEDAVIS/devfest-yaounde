/**
 * PawaPay returns `metadata` in more than one shape depending on the endpoint
 * and version: an array of single-key objects, an array of
 * `{ fieldName, fieldValue }` pairs, or a flat record. Normalise to one shape.
 *
 * Worth repeating because it is the mistake that costs money: metadata is
 * for observability only. What gets delivered is decided by the persisted
 * payment intent, never by anything PawaPay echoes back.
 */
export function normalizeMetadata(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      if (typeof record.fieldName === "string") {
        out[record.fieldName] = String(record.fieldValue ?? "");
      } else {
        for (const [key, value] of Object.entries(record)) {
          out[key] = String(value ?? "");
        }
      }
    }
    return out;
  }

  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      out[key] = String(value ?? "");
    }
  }
  return out;
}
