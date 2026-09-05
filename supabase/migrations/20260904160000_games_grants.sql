-- Table privileges for the games table, recording a fix that was applied by
-- hand to the live project. It is here so a fresh Supabase project reaches the
-- same state from the migrations alone.
--
-- RLS is not a grant. PostgREST checks table privileges first and only then
-- consults the policies, so a table with row level security enabled and no
-- grant is unreachable for every role: the request fails with 42501
-- "permission denied for table games" before a single policy is evaluated. The
-- policies in 20260904154403_games_table.sql are what narrow these privileges
-- to the user's own rows.
--
-- anon is deliberately left out. Nothing is saved or read without a session,
-- and an anonymous role that cannot reach the table at all is one less thing
-- for the policies to be the only defence against.
--
-- Re-running this is a no-op, so applying it to a project that already has the
-- grant is safe.

grant select, insert, delete on public.games to authenticated;
