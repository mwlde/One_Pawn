-- Phase 4A post-game analysis. One row per analysed ply of a saved game: the
-- move that was played, the engine's own choice from that position, the
-- evaluation before and after, and the resulting classification.
--
-- There is deliberately no user_id column. A move analysis belongs to a game,
-- and the game already knows its owner, so ownership is derived through the
-- foreign key rather than duplicated here and kept in sync forever. The cascade
-- on game_id is what makes a deleted game take its analyses with it.
--
-- eval_before, eval_after and eval_loss are centipawns. eval_before and
-- eval_after are from the perspective of whoever is to move in each position
-- (so eval_after flips sides relative to eval_before); eval_loss is how much
-- the played move gave up against the engine's best, always >= 0. See
-- lib/analysis/analyze-move.ts for how the three relate.

create table move_analyses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  ply int not null,
  move_uci text not null,
  engine_best_uci text not null,
  eval_before int not null,
  eval_after int not null,
  eval_loss int not null,
  classification text not null check (classification in ('best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder')),
  is_user_move boolean not null,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

alter table move_analyses enable row level security;

-- Ownership is the parent game's ownership. Each policy asks the same question:
-- does a game with this row's game_id belong to the caller? The subquery reads
-- games, whose own select policy already narrows it to the caller's rows, so a
-- game that is not theirs is simply not found and the row is out of reach. This
-- is the child-table equivalent of the games table's auth.uid() = user_id.
create policy "users read own analyses" on move_analyses for select using (
  exists (
    select 1 from games where games.id = move_analyses.game_id and games.user_id = auth.uid()
  )
);
create policy "users insert own analyses" on move_analyses for insert with check (
  exists (
    select 1 from games where games.id = move_analyses.game_id and games.user_id = auth.uid()
  )
);
create policy "users delete own analyses" on move_analyses for delete using (
  exists (
    select 1 from games where games.id = move_analyses.game_id and games.user_id = auth.uid()
  )
);

-- No update policy and no update grant. An analysis is derived from a fixed
-- game at a fixed depth, so it is never edited in place: a re-analysis deletes
-- the old rows and inserts fresh ones. Nothing here needs to change a row.

-- RLS is not a grant. PostgREST checks table privileges before it consults the
-- policies, so without this the table is unreachable for every role regardless
-- of the policies above. anon is left out for the same reason as on games:
-- nothing is analysed without a session. See 20260904160000_games_grants.sql.
grant select, insert, delete on public.move_analyses to authenticated;
