-- Phase 2 lesson progress. One row per user per lesson, holding the best result
-- across every completion: a replay updates the row rather than adding one, and
-- can only improve it. See record_lesson_completion() at the bottom.
--
-- This replaces the lessons and lesson_progress tables once sketched in
-- docs/ARCHITECTURE.md. Lesson content lives in static JSON files under
-- content/lessons/, so there is no lessons table for lesson_id to reference.
-- It is the lesson's string id from its JSON file, and the save route checks
-- it against the lessons the app actually ships.
--
-- user_id is not null, unlike games.user_id. The policies already make a null
-- owner impossible to insert, but the unique constraint treats nulls as
-- distinct, so the column constraint is what makes "one row per user per
-- lesson" true of the table itself rather than of the policies around it.

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  used_hints boolean not null,
  mistake_count int not null,
  unique (user_id, lesson_id)
);

alter table user_progress enable row level security;
create policy "users read own progress" on user_progress for select using (auth.uid() = user_id);
create policy "users insert own progress" on user_progress for insert with check (auth.uid() = user_id);
-- with check is spelled out although Postgres would reuse the using clause
-- without it: an update must not be able to hand a row to another user, and
-- that should be readable here rather than known.
create policy "users update own progress" on user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No delete policy. Removing progress is not a feature, and account deletion
-- removes these rows through the cascade on user_id, not through this role.

-- In the same migration as the table, unlike games, where the missing grant
-- was found after the fact (see 20260904160000_games_grants.sql). RLS narrows
-- privileges but grants none: without this, every request fails with 42501
-- before a policy is evaluated. anon is left out for the same reason as there.
-- record_lesson_completion() runs as the caller, so it needs both insert and
-- update here, and the policies above still apply to everything it writes.
grant select, insert, update on public.user_progress to authenticated;

-- Records one completion, keeping the best result on replay.
--
-- A plain upsert overwrites. A user who finished with no hints and then
-- replayed with hints would lose the perfect run, and Phase 3 graduates
-- lessons to SRS on exactly that flag. So a replay merges instead:
--
--   used_hints     stays false once any run was perfect (true only if the
--                  stored run and this one both used hints)
--   mistake_count  the fewest across all runs
--   completed_at   the latest run, so it still answers "when was this last
--                  done"
--
-- The two result columns are merged independently, so a row can pair the
-- fewest mistakes from one run with no hints from another. That is intended:
-- each column is a best-ever, not a snapshot of a single run.
--
-- A function because the merge cannot be expressed through PostgREST's upsert,
-- which can only overwrite with the incoming values. Security invoker, the
-- default, spelled out: unlike delete_own_account(), this needs no rights the
-- caller lacks, and running as the caller keeps RLS in force. user_id is
-- auth.uid() rather than a parameter, so no argument can aim the write at
-- another user; with no session it is null and the not null constraint refuses
-- the row.
--
-- Written with create or replace so it can be applied on its own to a project
-- that already has the table.
create or replace function public.record_lesson_completion(
  p_lesson_id text,
  p_used_hints boolean,
  p_mistake_count int
)
returns void
language sql
security invoker
set search_path = pg_catalog, public
as $$
  insert into public.user_progress (user_id, lesson_id, used_hints, mistake_count, completed_at)
  values (auth.uid(), p_lesson_id, p_used_hints, p_mistake_count, now())
  on conflict (user_id, lesson_id) do update set
    used_hints = user_progress.used_hints and excluded.used_hints,
    mistake_count = least(user_progress.mistake_count, excluded.mistake_count),
    completed_at = excluded.completed_at;
$$;

revoke execute on function public.record_lesson_completion(text, boolean, int) from public;
grant execute on function public.record_lesson_completion(text, boolean, int) to authenticated;
