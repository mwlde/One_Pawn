-- Phase 4B coach commentary. Two tables hold the LLM-generated feedback for a
-- Coach-mode game: one summary paragraph per game, and one row per notable move
-- that got its own explanation. Both are derived from a game's saved analysis
-- (move_analyses) and are safe to regenerate, so they cascade with the game.
--
-- As with move_analyses there is no user_id column: a commentary row belongs to
-- a game, and the game already knows its owner, so ownership is derived through
-- the foreign key rather than duplicated and kept in sync. The cascade on
-- game_id is what makes a deleted game take its commentary with it.
--
-- summary is nullable on purpose. The generator writes a game_commentary row
-- only once it has a summary in hand, so in practice it is always present, but
-- the column stays nullable so a future "regenerate the per-move notes but keep
-- the summary" path is not blocked by a not-null constraint.

create table game_commentary (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  summary text,
  generated_at timestamptz not null default now(),
  unique (game_id)
);

create table move_commentary (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  ply int not null,
  commentary text not null,
  reason text not null check (reason in ('blunder', 'mistake', 'inaccuracy', 'best_move', 'critical_moment')),
  generated_at timestamptz not null default now(),
  unique (game_id, ply, reason)
);

alter table game_commentary enable row level security;
alter table move_commentary enable row level security;

-- Ownership is the parent game's ownership, exactly as move_analyses does it:
-- each policy asks whether a game with this row's game_id belongs to the caller.
-- The games select policy already narrows that subquery to the caller's rows, so
-- a game that is not theirs is simply not found and the row is out of reach.
create policy "users read own game commentary" on game_commentary for select using (
  exists (
    select 1 from games where games.id = game_commentary.game_id and games.user_id = auth.uid()
  )
);
create policy "users insert own game commentary" on game_commentary for insert with check (
  exists (
    select 1 from games where games.id = game_commentary.game_id and games.user_id = auth.uid()
  )
);
create policy "users delete own game commentary" on game_commentary for delete using (
  exists (
    select 1 from games where games.id = game_commentary.game_id and games.user_id = auth.uid()
  )
);

create policy "users read own move commentary" on move_commentary for select using (
  exists (
    select 1 from games where games.id = move_commentary.game_id and games.user_id = auth.uid()
  )
);
create policy "users insert own move commentary" on move_commentary for insert with check (
  exists (
    select 1 from games where games.id = move_commentary.game_id and games.user_id = auth.uid()
  )
);
create policy "users delete own move commentary" on move_commentary for delete using (
  exists (
    select 1 from games where games.id = move_commentary.game_id and games.user_id = auth.uid()
  )
);

-- No update policy and no update grant on either table. Commentary is derived
-- and never edited in place: a regeneration deletes the old rows and inserts
-- fresh ones. Nothing here needs to change a row after it is written.

-- RLS is not a grant. PostgREST checks table privileges before it consults the
-- policies, so without these grants the tables are unreachable for every role
-- regardless of the policies above. anon is left out for the same reason as on
-- games and move_analyses: nothing is commentated without a session.
grant select, insert, delete on public.game_commentary to authenticated;
grant select, insert, delete on public.move_commentary to authenticated;
