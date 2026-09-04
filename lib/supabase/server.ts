import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/supabase/env";

// Server client, for server components, route handlers and server actions.
// Async because cookies() is async in Next 15+.
export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. Safe to swallow: the proxy
          // refreshes the session on every request, so the cookies it writes
          // are already current by the time a component reads them.
        }
      },
    },
  });
}
