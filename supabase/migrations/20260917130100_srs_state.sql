-- Phase 3 spaced repetition state. One row per user per lesson, created when
-- the lesson graduates: the first completion without hints. The columns are
-- SM-2's state, and lib/srs/sm2.ts is the only code that computes new values
-- for them.
--
-- A lesson that never graduated has no row, so "is it in the review queue" is
-- "does the row exist". Replays never touch an existing row: review history
-- is not reset by playing the lesson again from Learn.

create table srs_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null,
  ease_factor real not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table srs_state enable row level security;
create policy "users read own srs state" on srs_state for select using (auth.uid() = user_id);
create policy "users insert own srs state" on srs_state for insert with check (auth.uid() = user_id);
-- with check spelled out for the same reason as on user_progress: an update
-- must not be able to hand a row to another user.
create policy "users update own srs state" on srs_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No delete policy. SRS state lives as long as the lesson history does, and
-- account deletion removes it through the cascade on user_id.

grant select, insert, update on public.srs_state to authenticated;

-- record_lesson_completion() now also graduates, and says what happened:
--
--   already_graduated  a row already exists. Checked first, so a replay with
--                      hints of a graduated lesson reports this, not
--                      not_graduated.
--   not_graduated      this run used hints and there is no row.
--   graduated_now      this run used no hints and the row was created here.
--
-- Graduation reads this run's used_hints, not the merged column. A perfect run
-- recorded before this migration does not graduate the lesson on a later run
-- with hints; the next run without hints does.
--
-- In the function rather than a second request from the route so the progress
-- row and the SRS row are written in one transaction. on conflict do nothing
-- covers two completions racing: the second finds the first's row, inserts
-- nothing, and reports already_graduated.
--
-- The return type changes from void, which create or replace cannot do, so
-- the function is dropped and recreated with its grants.
drop function if exists public.record_lesson_completion(text, boolean, int, text[]);

create function public.record_lesson_completion(
  p_lesson_id text,
  p_used_hints boolean,
  p_mistake_count int,
  p_wrong_moves text[]
)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  insert into public.user_progress (user_id, lesson_id, used_hints, mistake_count, wrong_moves, completed_at)
  values (auth.uid(), p_lesson_id, p_used_hints, p_mistake_count, p_wrong_moves, now())
  on conflict (user_id, lesson_id) do update set
    used_hints = user_progress.used_hints and excluded.used_hints,
    mistake_count = least(user_progress.mistake_count, excluded.mistake_count),
    wrong_moves = excluded.wrong_moves,
    completed_at = excluded.completed_at;

  if exists (
    select 1 from public.srs_state
    where user_id = auth.uid() and lesson_id = p_lesson_id
  ) then
    return 'already_graduated';
  end if;

  if p_used_hints then
    return 'not_graduated';
  end if;

  -- Every SM-2 column takes its table default: ease 2.5, interval 1,
  -- repetitions 0, due now, never reviewed.
  insert into public.srs_state (user_id, lesson_id)
  values (auth.uid(), p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;

  if found then
    return 'graduated_now';
  end if;
  return 'already_graduated';
end;
$$;

revoke execute on function public.record_lesson_completion(text, boolean, int, text[]) from public;
grant execute on function public.record_lesson_completion(text, boolean, int, text[]) to authenticated;
