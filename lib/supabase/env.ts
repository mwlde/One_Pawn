// Both Supabase clients read the same two variables, so the missing-variable
// error is raised in one place rather than drifting between them.
//
// PUBLISHABLE_KEY, not ANON_KEY: the project issues Supabase's newer
// sb_publishable_... key, which replaces the legacy anon JWT. It is safe in the
// browser and carries no privileges of its own. RLS is what protects the data.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function requireSupabaseEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}
