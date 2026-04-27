-- ApexTuner — DB health check
-- Paste into the Supabase Dashboard SQL Editor (or psql).
-- All queries are read-only.

-- 1. Row counts across the core tables.
select 'profiles'  as table_name, count(*) as rows from public.profiles
union all
select 'cars',      count(*) from public.cars
union all
select 'tracks',    count(*) from public.tracks
union all
select 'tunes',     count(*) from public.tunes
union all
select 'tune_votes',count(*) from public.tune_votes
order by table_name;

-- 2. Sample of seeded reference data.
select id, make, model, year, drivetrain, category
from public.cars
order by make, year desc;

select id, name, layout, country
from public.tracks
order by name;

-- 3. What an anonymous (logged-out) homepage visitor would see for the
--    leaderboard query. If this is empty but step 1 shows tunes > 0, the
--    issue is RLS or is_public=false rows.
select id, title, is_public, upvote_count, lap_time_ms
from public.tunes
where is_public = true
order by upvote_count desc, created_at desc
limit 8;

-- 4. Confirm the upvote-count trigger is wired up.
select tgname, tgrelid::regclass as table, proname as function
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not tgisinternal
  and tgrelid in (
    'public.tune_votes'::regclass,
    'public.tunes'::regclass,
    'public.profiles'::regclass
  )
order by table, tgname;

-- 5. Confirm RLS is enabled where it should be.
select c.relname as table, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles','cars','tracks','tunes','tune_votes')
order by c.relname;

-- 6. List policies on each table (sanity check after migration).
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','cars','tracks','tunes','tune_votes')
order by tablename, cmd, policyname;

-- =================================================================
-- 7. SECURITY DEFINER hardening audit
-- After migration 0003 every SECURITY DEFINER function in public
-- should pin search_path to '' (empty). Anything else (including
-- NULL/unset) inherits the caller's search_path and is vulnerable to
-- search_path injection. Unknown rows here = candidates for the rogue
-- function.
-- =================================================================
select
  n.nspname as schema,
  p.proname as function,
  pg_get_function_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  coalesce(
    array_to_string(
      array(
        select unnest(p.proconfig) where unnest like 'search_path=%'
      ),
      ', '
    ),
    '(unset — caller-controlled)'
  ) as search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- =================================================================
-- 8. Rogue-function hunt
-- Find any function whose source body contains the offending UPDATE
-- pattern from the seed-failure error message. If this returns rows,
-- you've located the ghost.
-- =================================================================
select
  n.nspname as schema,
  p.proname as function,
  l.lanname as language,
  p.prosecdef as security_definer,
  pg_get_function_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where pg_get_functiondef(p.oid) ilike '%target_user_id%'
   or pg_get_functiondef(p.oid) ilike '%update%tunes%set%author_id%';

-- For each match above, dump the full source so we can read it. Edit
-- the schema/function names and uncomment:
-- select pg_get_functiondef(p.oid) as source
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = '<function-name-here>';

-- =================================================================
-- 9. Triggers across every schema that touch our public tables
-- Catches triggers defined in auth, storage, etc. that fire on auth
-- user signup or profile creation and reach into public.tunes.
-- =================================================================
select
  t.tgname as trigger,
  c.relname as on_table,
  n.nspname as schema,
  p.proname as function,
  fn.nspname as function_schema,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and (
    n.nspname in ('public','auth')
    or pg_get_functiondef(p.oid) ilike '%public.tunes%'
    or pg_get_functiondef(p.oid) ilike '%target_user_id%'
  )
order by schema, on_table, trigger;

-- =================================================================
-- 10. Verify migration 0003 is applied
-- These two functions should have search_path '' and the trigger
-- should exist.
-- =================================================================
select 'tune_votes_sync_count'      as expected, exists(
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.proname='tune_votes_sync_count'
    and 'search_path=' = any(p.proconfig)
) as hardened;

select 'handle_new_user'            as expected, exists(
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.proname='handle_new_user'
    and 'search_path=' = any(p.proconfig)
) as hardened;

select 'tunes_author_id_immutable'  as expected, exists(
  select 1 from pg_trigger
  where tgname='tunes_author_id_immutable' and not tgisinternal
) as installed;
