/**
 * Ticket claim tokens — the credential in a "claim your ticket" email link.
 *
 * Deterministic, same reasoning as `badge-code.ts`: HMAC(secret, ticketId).
 * The token is never stored — anyone holding the email can always ask this
 * module to recompute the same string from the ticket id alone, so there is
 * nothing in the database for a leaked backup or a curious admin to read.
 * `tickets.claimed_at` (0024_ticket_claim.sql) is what actually stops reuse:
 * a still-valid token for an already-claimed ticket is refused by
 * `claim_ticket()`, not by this module — a claim token has no built-in
 * expiry of its own, only single-use, enforced server-side at claim time.
 *
 * Unguessable because the HMAC key never leaves the server, exactly like a
 * badge code — but a SEPARATE secret from `BADGE_CODE_SECRET`. The two
 * protect different things (who may check a badge in at the door vs. who
 * may take over an account link to a ticket); sharing one key would mean a
 * change made for one reason silently affects the other.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.CLAIM_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "CLAIM_TOKEN_SECRET must be set to at least 32 characters — see .env.example",
    );
  }
  return value;
}

/** URL-safe, lowercase — this rides in a link, not a badge someone reads aloud. */
export function claimToken(ticketId: string): string {
  return createHmac("sha256", secret())
    .update(`claim:${ticketId}`)
    .digest("base64url");
}

export function verifyClaimToken(token: string, ticketId: string): boolean {
  const expected = Buffer.from(claimToken(ticketId));
  const actual = Buffer.from(token.trim());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Fails fast if the claim secret is unusable.
 *
 * Called at checkout, alongside `assertBadgeSecretConfigured` — a deposit
 * that can be paid for must be able to issue a claim link too, and finding
 * out only when the confirmation email tries to build one means a paid
 * attendee's claim link is silently missing from an otherwise normal receipt.
 */
export function assertClaimSecretConfigured(): void {
  secret();
}
