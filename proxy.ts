import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the middleware file convention to proxy. The Supabase helper
// keeps the name "middleware" because that is what Supabase's own docs call it.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except:
     * - _next/static and _next/image  (build output)
     * - favicon.ico, engine.js, engine.wasm  (static assets)
     * - image files
     * Refreshing a session for a static asset costs a Supabase round trip and
     * buys nothing.
     */
    "/((?!_next/static|_next/image|favicon.ico|engine\\.js|engine\\.wasm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
