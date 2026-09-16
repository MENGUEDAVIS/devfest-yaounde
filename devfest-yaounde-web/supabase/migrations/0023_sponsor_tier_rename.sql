/*
 * Sponsor tiers renamed to match the ticket tiers' own naming — ascending
 * Haikyu/Sonnet/Opus/Fable/Mythos — with `community` and `partner` kept as
 * the two non-monetary options (PHASE22 §A4).
 *
 * ONLY `platinum -> mythos` IS APPLIED HERE, deliberately. The live sponsor
 * data (checked read-only before writing this migration) holds exactly one
 * sponsor, tier `platinum` — top-to-top is the only part of this rename
 * that requires no guessing. `gold` and `silver` have NO rows to migrate in
 * the live project, and compressing three old paid tiers into five new ones
 * has no single correct answer (does `gold` become Opus? Fable? Sonnet?) —
 * PHASE22's own instructions say to ask a human rather than guess at an
 * ambiguous mapping, so this migration does not invent one.
 *
 * SAFETY, NOT SILENCE: if this ever runs against a database that DOES hold
 * `gold` or `silver` rows, it does not quietly leave them on a since-retired
 * tier name (which `sponsorSchema`'s enum would then reject on the next
 * save) or guess a mapping nobody signed off on. It raises instead, naming
 * exactly which sponsors are affected, so a human makes that call with the
 * real names in front of them.
 */
do $$
declare
  n int;
  names text;
begin
  select count(*), string_agg(item->>'name', ', ')
    into n, names
  from public.editorial_documents d,
       jsonb_array_elements(d.payload) as item
  where d.id = 'sponsors'
    and item->>'tier' in ('gold', 'silver');

  if n > 0 then
    raise exception
      'sponsor tier rename: % sponsor(s) on a retired tier with no confirmed replacement (gold/silver): %. Map these by hand — see the ADR — then re-run.',
      n, names;
  end if;
end $$;

update public.editorial_documents d
set payload = (
  select jsonb_agg(
    case when item->>'tier' = 'platinum'
      then item || jsonb_build_object('tier', 'mythos')
      else item
    end
    order by ordinality
  )
  from jsonb_array_elements(d.payload) with ordinality as t(item, ordinality)
)
where d.id = 'sponsors'
  and exists (
    select 1 from jsonb_array_elements(d.payload) as item
    where item->>'tier' = 'platinum'
  );
