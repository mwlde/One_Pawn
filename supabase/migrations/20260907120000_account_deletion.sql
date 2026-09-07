-- Self-service account deletion. Replaces the manual email request the privacy
-- policy and the terms described until now.
--
-- The delete has to reach auth.users, which no client role can write to, and
-- the one key that could is the service role key. That key is for migrations
-- only and must never be handed to user-triggered code, so the privilege lives
-- here instead: a definer function whose whole body is one delete pinned to the
-- caller's own id. A user can ask for exactly one row to go, their own, and
-- there is no argument to point it anywhere else.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
-- Pinned at the function level. A definer function inherits the caller's
-- search_path otherwise, and a caller who puts their own schema in front of
-- pg_catalog chooses which uid() this body actually calls. Everything below is
-- schema-qualified as well, so the pin is a second lock rather than the only
-- one.
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
begin
  -- A definer function runs with the owner's rights whoever calls it, so an
  -- unauthenticated call must be refused in the body. Without this, a null
  -- caller would fall through to a delete matching nothing, and the function
  -- would answer "done" to a request it never had a user for.
  if caller is null then
    raise exception 'delete_own_account requires an authenticated session'
      using errcode = '28000';
  end if;

  -- games.user_id references auth.users on delete cascade, so the user's saved
  -- games go with this row. Supabase's own auth tables (identities, sessions,
  -- refresh tokens) cascade the same way, which is what invalidates the
  -- session the caller is holding.
  delete from auth.users where id = caller;
end;
$$;

-- Postgres grants execute on a new function to public by default, which here
-- would include anon. The body already refuses a null caller, but an anonymous
-- role that cannot call the function at all is one less thing for that check to
-- be the only defence against.
revoke execute on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
