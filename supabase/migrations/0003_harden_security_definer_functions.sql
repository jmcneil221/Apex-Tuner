-- 0003 — harden SECURITY DEFINER functions and lock author_id
-- Two defensive moves to neutralize a class of bugs that bit us during
-- early development:
--
-- 1. Pin every SECURITY DEFINER function in the public schema to an
--    empty search_path with fully-qualified table names. Without this,
--    a SECURITY DEFINER function inherits the caller's search_path —
--    an attacker can create their own `tunes` table in a schema that
--    appears earlier and trick the function into operating on it.
--    `set search_path = ''` forces every reference to be schema-
--    qualified, eliminating the attack surface.
--
-- 2. Add an immutability trigger on tunes.author_id. A rogue function
--    (origin still under investigation, surfaced as
--    `UPDATE tunes SET author_id = target_user_id …`) was attempting
--    to rewrite ownership during user signup. This trigger raises an
--    exception on any UPDATE that changes author_id — so even if the
--    rogue function still exists, it can no longer corrupt ownership.
--
-- Idempotent: safe to re-run.

-- =================================================================
-- 1a. Harden tune_votes_sync_count
-- =================================================================
create or replace function public.tune_votes_sync_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.tunes
       set upvote_count = upvote_count + 1
     where id = new.tune_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.tunes
       set upvote_count = greatest(upvote_count - 1, 0)
     where id = old.tune_id;
    return old;
  end if;
  return null;
end;
$$;

-- =================================================================
-- 1b. Harden handle_new_user
-- =================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'driver_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =================================================================
-- 2. tunes.author_id immutability
-- Reject any UPDATE that attempts to change author_id, regardless of
-- which function or session initiates it. Forks (planned) create new
-- rows rather than mutating ownership, so this constraint matches the
-- product model.
-- =================================================================
create or replace function public.tunes_author_id_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'tunes.author_id is immutable (tune % attempted change from % to %)',
    old.id, old.author_id, new.author_id
    using errcode = 'check_violation',
          hint = 'If you genuinely need to transfer a tune, write an explicit one-shot SQL with auth context.';
end;
$$;

drop trigger if exists tunes_author_id_immutable on public.tunes;
create trigger tunes_author_id_immutable
  before update on public.tunes
  for each row
  when (old.author_id is distinct from new.author_id)
  execute function public.tunes_author_id_immutable();
