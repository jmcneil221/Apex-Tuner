-- 0002 — BoP context columns on tunes
-- Adds the post-tune balance-of-performance metadata that the UI surfaces:
--   power_hp     — engine output after restrictors/upgrades
--   weight_kg    — vehicle weight after ballast
--   pp_total     — GT7 Performance Points (integer, e.g. 498)
--   is_validated — moderator flag for vetted/featured tunes
-- All four are NULL-tolerant (except is_validated which defaults false).
-- Idempotent: safe to re-run.

alter table public.tunes
  add column if not exists power_hp integer
    check (power_hp is null or power_hp > 0),
  add column if not exists weight_kg integer
    check (weight_kg is null or weight_kg > 0),
  add column if not exists pp_total integer
    check (pp_total is null or pp_total > 0),
  add column if not exists is_validated boolean not null default false;

-- Index for PP-based browsing (e.g. /tunes?max_pp=500). Partial index keeps
-- it small by skipping rows where PP isn't recorded.
create index if not exists tunes_pp_total_idx
  on public.tunes (pp_total)
  where pp_total is not null;
