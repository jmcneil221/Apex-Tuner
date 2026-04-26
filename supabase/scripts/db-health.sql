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
