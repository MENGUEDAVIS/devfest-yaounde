# 0018 — Supabase Vault is the default secret store

Date: 2026-08-31
Status: Accepted — supersedes the recommendation in 0017, which stays available

## Context

`0017` moved the PawaPay token into AWS SSM, mirroring the SCD shop Lambda.
That works, but it was built on a misreading: what was actually asked for was
storing the keys **in Supabase**, and making the calls from there.

Rereading the trade-off with that in mind changes the answer.

## The argument that decides it

**Supabase is already load-bearing for every payment.** A checkout writes the
intent to Postgres before a redirect exists; fulfilment runs as a Postgres
function; the callback reads and writes there. If Supabase is unreachable, no
payment can start or complete, whatever else is true.

So reading the token from Supabase **adds no failure mode that checkout did
not already have.**

AWS SSM does. It puts a second cloud on the payment path — a provider that is
otherwise irrelevant to this application, with its own outages, its own IAM,
its own OIDC role to keep configured. It buys one thing that Vault cannot:
sharing a single credential with the SCD shop Lambda.

That is a real benefit, but it is not worth a new dependency on the money
path for a project that does not otherwise touch AWS.

## Decision

**Supabase Vault becomes the recommended production source.** Secrets are
stored encrypted at rest (authenticated encryption, so backups and replication
streams stay encrypted) and read through `public.get_vault_secret(name)`.

That function is `SECURITY DEFINER`, revoked from `public`, `anon` and
`authenticated`, and granted to `service_role` alone — the same shape as
`apply_paid_deposit` and `bump_rate_limit`. `vault.decrypted_secrets` is never
touched directly: anyone who can read that view can read every secret.

**No new credential is introduced.** The read uses the service-role key the
app already holds for checkout and fulfilment.

Resolution order in `src/lib/secrets/pawapay-token.ts`:

1. `PAWAPAY_API_TOKEN` — literal. Local development, or any deployment that
   wants nothing else in the path.
2. `PAWAPAY_TOKEN_VAULT_KEY` — Supabase Vault. **The production default.**
3. `PAWAPAY_TOKEN_PARAM` — AWS SSM, per `0017`. Kept, and only worth choosing
   to share one credential with the SCD shop.

Vault wins over SSM when both are set, which is the point of the ordering.

## Consequences

- **Rotation is one SQL statement** and needs no redeploy: the five-minute
  cache picks it up. `vault.update_secret(id, new_secret)`.
- **Vercel holds no payment credential.** It holds the _name_ of a secret and
  the Supabase keys it already needed.
- **The blast radius of the service-role key grows.** It could already read
  every row in the database; now it can also read Vault. That is a real
  widening, and it is the reason `get_vault_secret` takes a name rather than
  returning everything, and why `anon`/`authenticated` are revoked explicitly
  rather than left to default grants.
- Verified against the live project rather than assumed: `service_role` gets a
  value, `anon` gets `permission denied for function get_vault_secret`, and
  `vault.decrypted_secrets` is not reachable through PostgREST at all.
- `0017` is **not** reverted. The SSM path, the OIDC reasoning and its tests
  all remain; it is now the documented alternative rather than the default.
- The two integrations no longer share one credential by default. If that
  matters more than keeping AWS off this path, set `PAWAPAY_TOKEN_PARAM`
  instead — that is exactly why it was kept.

## What was NOT done

The request also mentioned making the calls "from that side" — i.e. Supabase
Edge Functions performing the PawaPay requests, so the token never reaches
Vercel at all.

That was not built, deliberately. The checkout logic it would have to move
alongside — server-side pricing, capacity reservation, the idempotent
fulfilment step — is TypeScript in the Next.js app, and Edge Functions are
Deno. Splitting the flow across two runtimes to gain "the token is never in
Vercel's memory" is a poor trade when Vercel already holds the service-role
key, which is strictly more powerful than the PawaPay token.

Worth revisiting if the callback ever moves to Supabase wholesale — which
would also remove the AWS relay, and is a coherent design. It is a separate
decision, not an extension of this one.
