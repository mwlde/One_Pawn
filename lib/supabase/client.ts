import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/supabase/env";

// Browser client. createBrowserClient stores the session in cookies rather than
// localStorage, which is what lets the server client and the proxy read the
// same session. It memoises internally, so calling this per component is fine.
export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient(url, key);
}
