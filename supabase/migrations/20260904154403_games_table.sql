-- Phase 1 games table. Schema is verbatim from the Phase 1 tables section of
-- docs/ARCHITECTURE.md; change that document first if this needs to differ.
--
-- user_id is nullable at the column level but every policy below pins it to
-- auth.uid(), so an anonymous insert is rejected rather than stored ownerless.

create table games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  pgn text not null,
  result text not null check (result in ('white_wins', 'black_wins', 'draw', 'abandoned')),
  user_color text not null check (user_color in ('white', 'black')),
  difficulty int not null,
  time_control text not null,
  move_count int not null,
  played_at timestamptz not null default now()
);

alter table games enable row level security;
create policy "users read own games" on games for select using (auth.uid() = user_id);
create policy "users insert own games" on games for insert with check (auth.uid() = user_id);
create policy "users delete own games" on games for delete using (auth.uid() = user_id);
