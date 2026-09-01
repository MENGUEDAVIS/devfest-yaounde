# 0017 — Read the PawaPay token from AWS SSM, via Vercel OIDC

Date: 2026-08-31
Status: Accepted — but see `0018`, which makes Supabase Vault the default

> **`0018` supersedes the recommendation here.** Everything below still works
> and is still supported; it is now the alternative, worth choosing only to
> share one credential with the SCD shop Lambda.

## Context

The organisation already runs a second PawaPay integration — the SCD shop, a
Lambda behind API Gateway. There, the token lives in SSM Parameter Store as a
SecureString (`/scd/prod/pawapay-token`), the deployment holds only the
parameter _name_, and the function fetches the value at first use and caches
it. `docs/setup/deployment.md` had this project reading `PAWAPAY_API_TOKEN`
from a Vercel environment variable instead.

Two integrations, two places to rotate the same credential. The request was to
make this project work the way the Lambda already does.

## The part that does not carry over

SSM costs a Lambda **zero secrets**: the execution role gives it an ambient
AWS identity, so it can read a parameter without holding any credential.

Vercel functions have no AWS identity. Naively porting the pattern would mean
storing a long-lived AWS access key in Vercel in order to avoid storing a
PawaPay token in Vercel — which **adds** a secret rather than removing one,
and swaps a payment token for a credential that reaches the rest of the AWS
account. That would have been a downgrade dressed as an improvement.

Vercel's OIDC federation closes the gap: the function receives a short-lived
OIDC token, exchanges it through `sts:AssumeRoleWithWebIdentity` for temporary
AWS credentials, and reads SSM with those. No static key anywhere.

## Decision

`src/lib/secrets/pawapay-token.ts` resolves the token from, in order:

1. **`PAWAPAY_API_TOKEN`** — the literal value. Wins when set. Local
   development, and any deployment that does not want AWS in the path.
2. **`PAWAPAY_TOKEN_PARAM`** — the _name_ of an SSM SecureString, read with
   `WithDecryption: true`. Same shape as the Lambda's environment.

Credentials for step 2:

- **`AWS_ROLE_ARN` set** → Vercel OIDC (`@vercel/functions/oidc`). The
  supported path in production.
- **unset** → the AWS SDK default chain, so a developer with `aws sso login`
  gets the same behaviour locally.

**Adopted from the Lambda:** name-not-value in the deployment, in-memory
caching, decryption at read time.

**Deliberately different:**

- **The cache has a five-minute TTL.** The Lambda caches for the life of the
  container and never re-reads, so a rotated token only takes effect when the
  container is recycled — unpredictable, and during an incident that is
  exactly when you want rotation to land. One SSM read every few minutes is a
  cheap price.
- **A failure throws.** The Lambda catches everything and returns `""`, which
  turns a broken IAM policy into "PawaPay not configured" on the customer's
  screen and a silently unpaid order. Here a missing configuration is a
  terminal error, and a failed SSM read is transient — which the callback
  route turns into a `5xx` so PawaPay resends rather than giving up.

## Consequences

- **One place to rotate.** `aws ssm put-parameter --overwrite` updates both
  integrations, and within five minutes neither needs a redeploy.
- **The payment path now depends on SSM being reachable.** Bounded: the SSM
  call has a 3-second timeout, is cached, and its failure is classified as
  transient, so PawaPay retries rather than the payment being lost.
- **Two new dependencies** (`@aws-sdk/client-ssm`, `@vercel/functions`), both
  imported dynamically so a deployment using `PAWAPAY_API_TOKEN` never loads
  them.
- Requires an IAM role trusting `oidc.vercel.com` with
  `ssm:GetParameter` on that one parameter, plus `kms:Decrypt` on the key if
  the SecureString uses a customer-managed key. `AWS_ROLE_ARN` and
  `AWS_REGION` become required Vercel variables.
- The env-var path stays first-class. If AWS access becomes awkward, setting
  `PAWAPAY_API_TOKEN` is a complete fallback with no code change.

## Alternatives considered

- **A static AWS access key in Vercel.** Rejected — see above.
- **Vercel env var only** (the previous design). Simpler, and still supported;
  it just leaves two copies of one credential.
- **Copying the token into Vercel from a CI job reading SSM.** Same objection
  as the GitHub→Vercel secret sync in `docs/setup/deployment.md`: a silent
  failure between "rotated" and "deployed" is an outage whose cause lives in
  another system.
