/**
 * PawaPay API client — Payment Page + authoritative deposit lookup.
 *
 * Two rules this module exists to enforce (docs/decisions/0013):
 *   1. `depositId` is generated HERE, server-side, one per attempt. It is the
 *      idempotency key for the whole flow.
 *   2. `checkDepositStatus` is the ONLY thing allowed to say whether money
 *      moved. The callback body is a notification, not evidence.
 *
 * Server-only. Never import this from a client component — it reads the API
 * token from the environment.
 */
import "server-only";
import { randomUUID } from "node:crypto";

const SANDBOX_BASE = "https://api.sandbox.pawapay.io";
const PRODUCTION_BASE = "https://api.pawapay.io";

/** PawaPay sits on the synchronous path of the callback: bound every call. */
const REQUEST_TIMEOUT_MS = 10_000;

export type PawaPayEnv = "sandbox" | "production";

export function pawapayEnv(): PawaPayEnv {
  return (process.env.PAWAPAY_ENV ?? "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

function baseUrl(): string {
  return pawapayEnv() === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

/**
 * Tokens pasted out of a CI secret almost always carry a trailing newline,
 * which turns into a bare `AUTHENTICATION_ERROR` with no useful message.
 */
function apiToken(): string {
  const token = (process.env.PAWAPAY_API_TOKEN ?? "").replace(/\s+/g, "");
  if (!token) {
    throw new PawaPayError("PAWAPAY_API_TOKEN is not set", {
      transient: false,
    });
  }
  return token;
}

/**
 * `transient: true` means "ask PawaPay to replay this callback later".
 * `transient: false` is terminal — retrying will not change the outcome.
 */
export class PawaPayError extends Error {
  readonly transient: boolean;
  readonly status?: number;

  constructor(message: string, opts: { transient: boolean; status?: number }) {
    super(message);
    this.name = "PawaPayError";
    this.transient = opts.transient;
    this.status = opts.status;
  }
}

async function pawapayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiToken()}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (cause) {
    // Network failure or timeout — the deposit may well be fine, we just
    // could not ask. Always transient.
    throw new PawaPayError(`PawaPay request failed: ${path}`, {
      transient: true,
      cause,
    } as never);
  }

  const body = await response.text();

  // 5xx from PawaPay is their problem and worth retrying; 4xx is ours.
  if (response.status >= 500) {
    throw new PawaPayError(`PawaPay returned ${response.status} for ${path}`, {
      transient: true,
      status: response.status,
    });
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new PawaPayError(
      `PawaPay returned a non-JSON body (${response.status}) for ${path}`,
      { transient: response.status >= 500, status: response.status },
    );
  }
}

/** One per payment attempt. Never reuse across retries of a failed attempt. */
export function createDepositId(): string {
  return randomUUID();
}

export interface PaymentPageInput {
  depositId: string;
  returnUrl: string;
  /** Truncated to 50 characters by PawaPay; we truncate first so it is ours. */
  reason?: string;
  language?: "EN" | "FR";
  /** ISO-3166 alpha-3, e.g. "CMR". */
  country?: string;
  amountDetails?: { amount: string; currency: string };
  phoneNumber?: string;
  /** Observability only — never a source of truth for what to deliver. */
  metadata?: Array<Record<string, string>>;
}

export interface PaymentPageResult {
  depositId: string;
  redirectUrl?: string;
  status?: string;
  failureReason?: { failureCode?: string; failureMessage?: string };
}

export async function createPaymentPage(
  input: PaymentPageInput,
): Promise<PaymentPageResult> {
  const payload: Record<string, unknown> = {
    depositId: input.depositId,
    returnUrl: input.returnUrl,
    language: input.language ?? "FR",
  };
  if (input.reason) payload.reason = input.reason.slice(0, 50);
  if (input.country) payload.country = input.country;
  if (input.amountDetails) payload.amountDetails = input.amountDetails;
  if (input.phoneNumber) payload.phoneNumber = input.phoneNumber;
  if (input.metadata?.length) payload.metadata = input.metadata;

  return pawapayFetch<PaymentPageResult>("/v2/paymentpage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface DepositRecord {
  depositId: string;
  status: string;
  amount?: string;
  depositedAmount?: string;
  currency?: string;
  metadata?: unknown;
  failureReason?: { failureCode?: string; failureMessage?: string };
}

export interface DepositLookup {
  status: "FOUND" | "NOT_FOUND" | "REJECTED";
  data?: DepositRecord;
}

/**
 * The authoritative answer. Used by BOTH the callback and the status poll, so
 * there is exactly one definition of "did this get paid".
 */
export async function checkDepositStatus(
  depositId: string,
): Promise<DepositLookup> {
  return pawapayFetch<DepositLookup>(
    `/v2/deposits/${encodeURIComponent(depositId)}`,
    { method: "GET" },
  );
}
