-- 0004 — tune forks
-- Adds a self-referencing forked_from_id on tunes so a driver can
-- duplicate another setup into their own garage and iterate. Forks
-- create new rows (they don't mutate ownership), so the
-- tunes_author_id_immutable trigger from 0003 is unaffected.
--
-- ON DELETE SET NULL: deleting the parent tune severs the link
-- without deleting any forks. Forks remain valid in the forker's
-- garage; they just lose their attribution badge.
--
-- Idempotent: safe to re-run.

alter table public.tunes
  add column if not exists forked_from_id uuid
    references public.tunes(id) on delete set null;

-- Partial index — most tunes are originals, so skipping NULLs keeps
-- the index small while still accelerating "all forks of tune X" lookups.
create index if not exists tunes_forked_from_idx
  on public.tunes (forked_from_id)
  where forked_from_id is not null;
