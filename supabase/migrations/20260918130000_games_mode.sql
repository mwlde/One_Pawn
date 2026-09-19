-- Phase 4A.5 mode selection. Records which mode a game was played in: plain
-- Play, or Play with coach. The mode is chosen at setup, locked for the game,
-- and read later when coach features (4B onwards) decide what to show.
--
-- The column is not null with a default of 'play'. Every existing row predates
-- mode selection and was, in effect, a plain game, so the default backfills
-- them correctly without a data migration. The check constraint matches the
-- games table's other enumerated columns (result, user_color).

alter table games add column mode text not null default 'play' check (mode in ('play', 'coach'));

-- No new grant or policy. mode is a column on games, so it is already covered
-- by the table privileges and RLS policies in 20260904154403_games_table.sql
-- and 20260904160000_games_grants.sql.
