-- Records the wrong moves of a lesson run, for coach analysis in a later phase.
--
-- Each entry is "<step id>:<from><to>", for example "fork-on-f7:e1e2", in the
-- order they were played. The step id is what makes a move readable later:
-- the same squares mean different things on different steps, and the step's
-- FEN is in the lesson file.
--
-- Nullable, so rows written before this column existed stay valid. Null means
-- "not recorded"; an empty array means a run with no wrong moves.

alter table user_progress add column wrong_moves text[];

-- The existing grant already covers the new column: select, insert and update
-- were granted on the whole table, not per column, in
-- 20260917120000_user_progress.sql. Nothing to add here.

-- record_lesson_completion() gains a parameter. A new argument list is a new
-- function to Postgres, so the old one is dropped rather than left as an
-- overload that PostgREST would have to choose between.
--
-- wrong_moves follows completed_at: the latest run, not a best-ever. A list
-- of moves cannot be "best" in the way a count can, and the latest run is the
-- one that says what the user still gets wrong.
drop function if exists public.record_lesson_completion(text, boolean, int);

create function public.record_lesson_completion(
  p_lesson_id text,
  p_used_hints boolean,
  p_mistake_count int,
  p_wrong_moves text[]
)
returns void
language sql
security invoker
set search_path = pg_catalog, public
as $$
  insert into public.user_progress (user_id, lesson_id, used_hints, mistake_count, wrong_moves, completed_at)
  values (auth.uid(), p_lesson_id, p_used_hints, p_mistake_count, p_wrong_moves, now())
  on conflict (user_id, lesson_id) do update set
    used_hints = user_progress.used_hints and excluded.used_hints,
    mistake_count = least(user_progress.mistake_count, excluded.mistake_count),
    wrong_moves = excluded.wrong_moves,
    completed_at = excluded.completed_at;
$$;

revoke execute on function public.record_lesson_completion(text, boolean, int, text[]) from public;
grant execute on function public.record_lesson_completion(text, boolean, int, text[]) to authenticated;
