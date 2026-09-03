-- ============================================================================
-- 0010 — Trigger the cleanup sweep from Supabase (Hobby cannot use Vercel */5)
--
-- `/api/cron/cleanup` is unchanged: it still reconciles PawaPay, expires
-- abandoned intents, prunes rate-limits, and purges old wall cards. What
-- changes is who calls it. See ADR 0028.
--
-- Secrets are NOT in this file. After applying, once, in the SQL editor:
--
--   select vault.create_secret('https://YOUR-DOMAIN', 'app-base-url');
--   select vault.create_secret('<same value as CRON_SECRET on Vercel>', 'cron-secret');
--
-- Until both exist the job runs, logs a warning, and does nothing — so this
-- migration is safe to apply before the domain is known.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

/**
 * One HTTP GET to the Next.js cleanup route.
 *
 * Reads the origin and the bearer from Vault at call time. Missing either
 * is a configuration gap, not a crash: a job that throws every five minutes
 * fills the logs and helps nobody.
 *
 * pg_net is async — this returns a request id as soon as the row is queued.
 * The default 2 s timeout would cancel the Function while it is still
 * talking to PawaPay; 15 s is comfortably past the Hobby 10 s cap.
 */
create or replace function public.invoke_cleanup_sweep()
returns bigint
language plpgsql
security definer
set search_path = public, net, vault
as $fn$
declare
  v_url    text;
  v_secret text;
  v_id     bigint;
begin
  v_url    := nullif(trim(coalesce(public.get_vault_secret('app-base-url'), '')), '');
  v_secret := nullif(trim(coalesce(public.get_vault_secret('cron-secret'), '')), '');

  if v_url is null or v_secret is null then
    raise warning 'cleanup sweep skipped: vault secrets app-base-url and cron-secret must both be set — see docs/decisions/0028';
    return null;
  end if;

  v_url := rtrim(v_url, '/');

  select net.http_get(
    url := v_url || '/api/cron/cleanup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Accept', 'application/json'
    ),
    timeout_milliseconds := 15000
  ) into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.invoke_cleanup_sweep() from public, anon, authenticated;

comment on function public.invoke_cleanup_sweep() is
  'pg_cron entrypoint: GET /api/cron/cleanup with the Vault bearer. ADR 0028.';

-- Idempotent: drop the previous schedule if a re-apply races, then insert.
do $outer$
declare
  v_id bigint;
begin
  select jobid into v_id from cron.job where jobname = 'devfest-cleanup-sweep';
  if v_id is not null then
    perform cron.unschedule(v_id);
  end if;
end
$outer$;

select cron.schedule(
  'devfest-cleanup-sweep',
  '*/5 * * * *',
  $$select public.invoke_cleanup_sweep()$$
);
