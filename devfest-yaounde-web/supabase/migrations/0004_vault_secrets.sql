-- ============================================================================
-- 0004 — Read runtime secrets from Supabase Vault
--
-- Vault stores secrets encrypted on disk (authenticated encryption, so
-- backups and replication streams stay encrypted too) and exposes them
-- through the `vault.decrypted_secrets` view, which decrypts on the fly.
--
-- Anyone who can read that view can read every secret, so it is never
-- exposed directly. Access goes through one SECURITY DEFINER function,
-- granted to `service_role` alone — the same shape as apply_paid_deposit and
-- bump_rate_limit. `anon` and `authenticated` cannot reach it at all, which
-- matters because those are the keys that ship to browsers.
--
-- Why here rather than AWS SSM (0017): Supabase is already on the payment
-- path. If it is down, checkout is down regardless. Reading the token from it
-- therefore adds no new point of failure, while SSM added a second cloud.
-- ============================================================================

create extension if not exists supabase_vault with schema vault;

/**
 * Returns a decrypted secret by name, or null when there is no such secret.
 *
 * Deliberately NOT `stable` — a secret can be rotated between two calls in
 * the same transaction, and a cached plan returning the old value during a
 * rotation is the exact failure this is meant to avoid.
 */
create or replace function public.get_vault_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $fn$
declare
  v_value text;
begin
  select decrypted_secret into v_value
    from vault.decrypted_secrets
   where name = p_name
   limit 1;

  return v_value;
end;
$fn$;

-- Deny by default, then hand it to the service role only. `anon` and
-- `authenticated` are the keys that reach browsers; they must never be able
-- to call this, even by guessing a secret's name.
revoke all on function public.get_vault_secret(text) from public, anon, authenticated;
grant execute on function public.get_vault_secret(text) to service_role;

comment on function public.get_vault_secret(text) is
  'Reads one secret from Supabase Vault. service_role only — see docs/decisions/0018.';
