/**
 * Where the PawaPay token comes from.
 *
 * Mirrors the pattern already used by the SCD shop Lambda: the deployment
 * holds the *name* of an SSM parameter, never the value, and the value is
 * fetched at runtime and cached in memory.
 *
 * Two sources, in order:
 *
 *   PAWAPAY_API_TOKEN   — the literal token. Wins if set. Local development,
 *                         and any deployment without AWS.
 *   PAWAPAY_TOKEN_PARAM — the name of a SecureString parameter, e.g.
 *                         /scd/prod/pawapay-token. Read through SSM with
 *                         decryption.
 *
 * On credentials — this is the part that does not carry over from Lambda for
 * free. A Lambda has an execution role, so SSM costs zero secrets: the
 * identity is ambient. Vercel has no AWS identity by default, so:
 *
 *   AWS_ROLE_ARN set → Vercel OIDC. The function exchanges a short-lived
 *                      OIDC token for temporary AWS credentials. No static
 *                      key anywhere. This is the only version worth doing.
 *   AWS_ROLE_ARN unset → the SDK's default credential chain (a local
 *                      `aws sso login`, or an env-var key pair).
 *
 * Storing a long-lived AWS access key in Vercel in order to avoid storing the
 * PawaPay token there would be a step backwards: it adds a secret rather than
 * removing one, and an AWS key reaches further than a payment token. See
 * docs/decisions/0017-pawapay-token-from-ssm.md.
 */
import "server-only";

/**
 * Cached, but not forever. The Lambda version caches for the life of the
 * container and never re-reads, so a rotated token only takes effect when
 * the container is recycled. A short TTL means rotation lands on its own,
 * at the cost of one SSM read every few minutes.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const SSM_TIMEOUT_MS = 3000;

let cachedToken: string | null = null;
let cachedAt = 0;

/** Injection point for tests — never set in production code. */
type ParameterReader = (name: string) => Promise<string>;
let readParameterOverride: ParameterReader | null = null;

export function __setParameterReaderForTests(reader: ParameterReader | null) {
  readParameterOverride = reader;
  resetTokenCache();
}

export function resetTokenCache() {
  cachedToken = null;
  cachedAt = 0;
}

async function credentials() {
  // Only reach for Vercel's OIDC helper when a role is actually configured;
  // importing it elsewhere would fail outside a Vercel function.
  const roleArn = process.env.AWS_ROLE_ARN;
  if (!roleArn) return undefined;

  const { awsCredentialsProvider } = await import("@vercel/functions/oidc");
  return awsCredentialsProvider({ roleArn });
}

async function readParameter(name: string): Promise<string> {
  if (readParameterOverride) return readParameterOverride(name);

  const { SSMClient, GetParameterCommand } =
    await import("@aws-sdk/client-ssm");

  const client = new SSMClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: await credentials(),
    // The token is fetched on the payment path; a hung socket must not hold
    // a checkout open until the platform timeout.
    requestHandler: { requestTimeout: SSM_TIMEOUT_MS },
  });

  const result = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );

  const value = result.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${name} is empty`);
  return value;
}

/**
 * The token, from whichever source is configured.
 *
 * Throws rather than returning "" when nothing is configured. The Lambda
 * version returns an empty string and the caller degrades to "PawaPay not
 * configured"; here a missing token means a checkout cannot be created at
 * all, so failing loudly at the boundary is more useful than a request that
 * gets to PawaPay and comes back as an opaque auth error.
 */
export async function resolvePawapayToken(): Promise<string> {
  // Pasted secrets routinely carry a trailing newline from a CI copy-paste.
  const direct = (process.env.PAWAPAY_API_TOKEN ?? "").replace(/\s+/g, "");
  if (direct) return direct;

  const paramName = process.env.PAWAPAY_TOKEN_PARAM;
  if (!paramName) {
    throw new Error(
      "No PawaPay token configured: set PAWAPAY_API_TOKEN, or PAWAPAY_TOKEN_PARAM to an SSM parameter name — see .env.example",
    );
  }

  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL_MS) return cachedToken;

  const value = (await readParameter(paramName)).replace(/\s+/g, "");
  if (!value)
    throw new Error(`SSM parameter ${paramName} holds an empty token`);

  cachedToken = value;
  cachedAt = now;
  return value;
}
