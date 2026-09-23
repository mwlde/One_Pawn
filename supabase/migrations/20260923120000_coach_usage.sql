-- Pre-alpha rate limiting for coach analysis. Every fresh coach analysis (the
-- Groq-backed commentary generated at the end of a Coach-mode game, and the
-- manual regeneration from the profile) writes one row here. The coach route
-- counts a user's rows in the last 24 hours before spending anything on Groq,
-- so a handful of games cannot run up an open-ended bill during the alpha.
--
-- One row per generation, not per game: a cache hit spends nothing and does not
-- count, so a game already commentated never adds a row when it is reopened.
--
-- Like move_analyses and the commentary tables, a row belongs to a game and to
-- the user who owns it. The game_id cascade takes the usage row with the game
-- if the game is deleted; the user_id cascade takes it with the account.

create table coach_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  game_id uuid not null references games on delete cascade,
  created_at timestamptz not null default now()
);

create index coach_usage_user_created_idx on coach_usage(user_id, created_at desc);

alter table coach_usage enable row level security;

-- A user reads and writes only their own usage. The count that gates the limit
-- runs as the user, so the read policy is what makes that count see the user's
-- own rows and nothing else. There is no update or delete: a usage row is a
-- fact about a call that was made, and nothing rewrites history.
create policy "users read own coach usage" on coach_usage for select using (
  auth.uid() = user_id
);
create policy "users insert own coach usage" on coach_usage for insert with check (
  auth.uid() = user_id
);

-- RLS is not a grant: PostgREST checks table privileges before the policies, so
-- without this the table is unreachable regardless of the policies above. anon
-- is left out for the same reason as on games: nothing here happens without a
-- session.
grant select, insert on public.coach_usage to authenticated;
