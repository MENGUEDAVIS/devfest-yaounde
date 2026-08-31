/**
 * Callback hardening — defence in depth around the PawaPay webhook.
 *
 * The real guard is elsewhere: `applyDepositIfCompleted` re-fetches the
 * deposit from PawaPay and never believes the request body. Everything here
 * is a second fence, and it is deliberately built so that turning it on can
 * never silently reject a genuine payment:
 *
 *   - every check runs in MONITOR mode by default and just reports pass/fail
 *   - a check only rejects when its own enforcement flag is set
 *
 * Roll-out: deploy in monitor, read the logs until real callbacks report
 * `ip: pass`, `digest: pass`, `signature: pass`, then flip the flags.
 *
 * Standards: RFC-9530 (Content-Digest), RFC-9421 (HTTP Message Signatures).
 *
 * Behind a relay: if an API Gateway forwards callbacks to this app, PawaPay
 * signed the RELAY's address, and its IP is the relay's, not PawaPay's. Set
 * PAWAPAY_SIGNATURE_AUTHORITY / PAWAPAY_SIGNATURE_PATH to the registered
 * address to keep signature checking meaningful, and point
 * PAWAPAY_CALLBACK_IPS at the relay. See docs/guides/payments-runbook.md.
 */
import "server-only";
import {
  createHash,
  createPublicKey,
  verify as cryptoVerify,
} from "node:crypto";

/** A signature older than this is treated as a replay, not a retry. */
const MAX_SIGNATURE_AGE_SECONDS = 300;

export type CheckOutcome = "pass" | "fail" | "skipped";

export interface VerificationReport {
  ip: CheckOutcome;
  digest: CheckOutcome;
  signature: CheckOutcome;
  replay: CheckOutcome;
  /** True when a FAILED check is also being enforced — reject the request. */
  reject: boolean;
  reasons: string[];
}

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

function isProduction(): boolean {
  return (process.env.PAWAPAY_ENV ?? "sandbox").toLowerCase() === "production";
}

// ---------------------------------------------------------------- IP ------

/**
 * PawaPay publishes the IPs its callbacks originate from. Configure them as a
 * comma-separated list; leave unset to skip the check entirely.
 */
function allowedIps(): string[] {
  return (process.env.PAWAPAY_CALLBACK_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Behind Vercel's proxy, `x-forwarded-for` is a chain and only the FIRST entry
 * is the real client — the rest are appendable by anyone upstream.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}

function checkIp(headers: Headers): { outcome: CheckOutcome; reason?: string } {
  const allow = allowedIps();
  if (allow.length === 0) return { outcome: "skipped" };

  const ip = clientIp(headers);
  if (!ip) return { outcome: "fail", reason: "no client ip on request" };
  if (!allow.includes(ip))
    return { outcome: "fail", reason: `ip ${ip} not allow-listed` };
  return { outcome: "pass" };
}

// ------------------------------------------------------ Content-Digest ----

/**
 * RFC-9530: `Content-Digest: sha-256=:<base64>:`. Recomputed over the RAW
 * body — re-serialising parsed JSON would change the bytes and never match.
 */
function checkDigest(
  headers: Headers,
  rawBody: string,
): { outcome: CheckOutcome; reason?: string } {
  const header = headers.get("content-digest");
  if (!header) return { outcome: "skipped" };

  const match = /sha-256=:([A-Za-z0-9+/=]+):/.exec(header);
  if (!match) return { outcome: "fail", reason: "malformed content-digest" };

  const expected = createHash("sha256")
    .update(rawBody, "utf8")
    .digest("base64");
  return match[1] === expected
    ? { outcome: "pass" }
    : { outcome: "fail", reason: "content-digest does not match body" };
}

// --------------------------------------------------- HTTP signatures ------

interface ParsedSignatureInput {
  label: string;
  components: string[];
  params: Record<string, string | number>;
  raw: string;
}

/**
 * Parses `Signature-Input: sig1=("@method" "content-digest");created=…;keyid=…`
 * into the pieces needed to rebuild the signature base.
 */
function parseSignatureInput(header: string): ParsedSignatureInput | null {
  const match = /^([A-Za-z0-9_-]+)=(\((.*?)\)(.*))$/.exec(header.trim());
  if (!match) return null;

  const [, label, raw, componentList, paramTail] = match;

  const components = (componentList.match(/"[^"]*"/g) ?? []).map((c) =>
    c.slice(1, -1),
  );

  const params: Record<string, string | number> = {};
  for (const part of paramTail.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value: string | number = trimmed.slice(eq + 1);
    if (
      typeof value === "string" &&
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      value = value.slice(1, -1);
    } else if (/^\d+$/.test(String(value))) {
      value = Number(value);
    }
    params[key] = value;
  }

  return { label, components, params, raw };
}

/** Rebuilds the RFC-9421 signature base, in the exact order signed. */
/**
 * The address PawaPay actually signed.
 *
 * When a relay sits in front of us (an API Gateway forwarding to this app),
 * PawaPay signed the RELAY's authority and path — not ours. Rebuilding the
 * signature base from the request as we received it would then never verify,
 * no matter how correct the signature is.
 *
 * Setting these two variables to the address registered with PawaPay lets the
 * signature check keep working through a relay. Leave them unset when PawaPay
 * calls this app directly.
 */
function signedOrigin(): { authority?: string; path?: string } {
  return {
    authority: process.env.PAWAPAY_SIGNATURE_AUTHORITY || undefined,
    path: process.env.PAWAPAY_SIGNATURE_PATH || undefined,
  };
}

function buildSignatureBase(
  parsed: ParsedSignatureInput,
  request: { method: string; url: URL; headers: Headers },
): string | null {
  const lines: string[] = [];
  const origin = signedOrigin();

  for (const component of parsed.components) {
    let value: string | null;
    switch (component) {
      case "@method":
        value = request.method.toUpperCase();
        break;
      case "@authority":
        value =
          origin.authority ?? request.headers.get("host") ?? request.url.host;
        break;
      case "@path":
        value = origin.path ?? request.url.pathname;
        break;
      case "@target-uri":
        value =
          origin.authority || origin.path
            ? `${request.url.protocol}//${origin.authority ?? request.url.host}${origin.path ?? request.url.pathname}`
            : request.url.toString();
        break;
      case "@scheme":
        value = request.url.protocol.replace(":", "");
        break;
      case "@query":
        value = request.url.search;
        break;
      default:
        value = request.headers.get(component);
    }
    // A signed component we cannot reproduce means we cannot verify at all.
    if (value === null) return null;
    lines.push(`"${component}": ${value}`);
  }

  lines.push(`"@signature-params": ${parsed.raw}`);
  return lines.join("\n");
}

/**
 * Anti-replay. `created`/`expires` live INSIDE the signed parameters, so a
 * captured callback replayed later still carries its original timestamps —
 * which is exactly what distinguishes it from a genuine PawaPay retry.
 */
function checkFreshness(params: Record<string, string | number>): {
  outcome: CheckOutcome;
  reason?: string;
} {
  const now = Math.floor(Date.now() / 1000);
  const created = Number(params.created);
  const expires = Number(params.expires);

  if (!Number.isFinite(created) && !Number.isFinite(expires)) {
    return { outcome: "skipped" };
  }
  if (Number.isFinite(expires) && now > expires) {
    return { outcome: "fail", reason: "signature expired" };
  }
  if (Number.isFinite(created) && now - created > MAX_SIGNATURE_AGE_SECONDS) {
    return { outcome: "fail", reason: "signature too old (possible replay)" };
  }
  if (Number.isFinite(created) && created - now > 60) {
    return { outcome: "fail", reason: "signature created in the future" };
  }
  return { outcome: "pass" };
}

function pinnedPublicKey(): string | null {
  const pem = process.env.PAWAPAY_CALLBACK_PUBLIC_KEY;
  if (!pem) return null;
  // Vercel's env UI collapses newlines; accept the escaped form too.
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
}

function checkSignature(request: {
  method: string;
  url: URL;
  headers: Headers;
}): {
  outcome: CheckOutcome;
  reason?: string;
  params?: Record<string, string | number>;
} {
  const pem = pinnedPublicKey();
  if (!pem) return { outcome: "skipped" };

  const inputHeader = request.headers.get("signature-input");
  const signatureHeader = request.headers.get("signature");
  if (!inputHeader || !signatureHeader) {
    return { outcome: "fail", reason: "signature headers missing" };
  }

  const parsed = parseSignatureInput(inputHeader);
  if (!parsed) return { outcome: "fail", reason: "malformed signature-input" };

  const sigMatch = new RegExp(`${parsed.label}=:([A-Za-z0-9+/=]+):`).exec(
    signatureHeader,
  );
  if (!sigMatch)
    return { outcome: "fail", reason: "malformed signature header" };

  const base = buildSignatureBase(parsed, request);
  if (base === null) {
    return {
      outcome: "fail",
      reason: "a signed component is absent from the request",
    };
  }

  try {
    const key = createPublicKey(pem);
    // PawaPay signs with ECDSA P-256 (raw r||s), which Node calls "ieee-p1363".
    const algorithm = key.asymmetricKeyType === "ec" ? "sha256" : "sha256";
    const ok = cryptoVerify(
      algorithm,
      Buffer.from(base, "utf8"),
      key.asymmetricKeyType === "ec"
        ? { key, dsaEncoding: "ieee-p1363" }
        : { key },
      Buffer.from(sigMatch[1], "base64"),
    );
    return ok
      ? { outcome: "pass", params: parsed.params }
      : {
          outcome: "fail",
          reason: "signature did not verify",
          params: parsed.params,
        };
  } catch (err) {
    return {
      outcome: "fail",
      reason: `signature verification threw: ${(err as Error).message}`,
      params: parsed.params,
    };
  }
}

// ------------------------------------------------------------ public ------

/**
 * Runs every fence and reports what happened. `reject` is true only when a
 * check FAILED *and* its enforcement flag is on.
 */
export function verifyCallback(
  request: { method: string; url: URL; headers: Headers },
  rawBody: string,
): VerificationReport {
  const reasons: string[] = [];

  const enforceIp = flag("PAWAPAY_ENFORCE_IP", isProduction());
  const enforceSignature = flag(
    "PAWAPAY_ENFORCE_SIGNATURE",
    Boolean(pinnedPublicKey()),
  );
  const enforceDigest = flag("PAWAPAY_ENFORCE_DIGEST", enforceSignature);

  const ip = checkIp(request.headers);
  const digest = checkDigest(request.headers, rawBody);
  const signature = checkSignature(request);
  const replay = signature.params
    ? checkFreshness(signature.params)
    : { outcome: "skipped" as CheckOutcome };

  let reject = false;
  const record = (
    name: string,
    result: { outcome: CheckOutcome; reason?: string },
    enforced: boolean,
  ) => {
    if (result.outcome === "fail") {
      reasons.push(
        `${name}: ${result.reason ?? "failed"}${enforced ? "" : " (monitor only)"}`,
      );
      if (enforced) reject = true;
    }
  };

  record("ip", ip, enforceIp);
  record("digest", digest, enforceDigest);
  record("signature", signature, enforceSignature);
  // Freshness rides with the signature: enforcing one without the other is
  // meaningless, since an unverified timestamp proves nothing.
  record("replay", replay, enforceSignature);

  return {
    ip: ip.outcome,
    digest: digest.outcome,
    signature: signature.outcome,
    replay: replay.outcome,
    reject,
    reasons,
  };
}
