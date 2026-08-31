/**
 * Ticket badge codes — the string behind the QR at the door.
 *
 * Deterministic on purpose: HMAC(secret, `depositId:index`). A replayed
 * PawaPay callback therefore regenerates the SAME code rather than a second
 * one, which is what lets fulfilment stay idempotent without a lookup.
 *
 * Unguessable because the HMAC key never leaves the server, so nobody can
 * mint a code for a deposit that was never paid.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Crockford base32: no I, L, O or U, so nothing is misread off a screen. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP = 5;
const GROUPS = 2;

function secret(): string {
  const value = process.env.BADGE_CODE_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "BADGE_CODE_SECRET must be set to at least 32 characters — see .env.example",
    );
  }
  return value;
}

function encode(bytes: Buffer, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * @param depositId the payment intent this ticket belongs to
 * @param index     1-based position of the attendee within that intent
 */
export function badgeCode(depositId: string, index: number): string {
  const digest = createHmac("sha256", secret())
    .update(`${depositId}:${index}`)
    .digest();

  const raw = encode(digest, GROUP * GROUPS);
  const parts: string[] = [];
  for (let i = 0; i < GROUPS; i++) {
    parts.push(raw.slice(i * GROUP, (i + 1) * GROUP));
  }
  return `DFY-${parts.join("-")}`;
}

/** Generates the full set for an intent, in attendee order. */
export function badgeCodesFor(depositId: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => badgeCode(depositId, i + 1));
}

/**
 * Check-in helper: confirms a scanned code really belongs to this deposit and
 * position, without trusting whatever the scanner app sent along with it.
 */
export function verifyBadgeCode(
  code: string,
  depositId: string,
  index: number,
): boolean {
  const expected = Buffer.from(badgeCode(depositId, index));
  const actual = Buffer.from(code.trim().toUpperCase());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Fails fast if the badge secret is unusable.
 *
 * Called at checkout, BEFORE a payment page is created. Without this the
 * first sign of a missing or too-short `BADGE_CODE_SECRET` is an exception
 * during fulfilment — after the buyer has paid. The callback then answers
 * 5xx, PawaPay retries forever, and someone is out of pocket with no ticket.
 *
 * An empty value fails here exactly like an absent one: both are a
 * deployment that cannot issue tickets.
 */
export function assertBadgeSecretConfigured(): void {
  secret();
}
