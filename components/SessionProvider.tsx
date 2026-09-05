"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";

type SessionValue = {
  userId: string | null;
};

const SessionContext = createContext<SessionValue | null>(null);

// Seeded from the session the app layout already read on the server, so the
// first paint of a screen that cares is right rather than briefly wrong.
//
// Chosen over threading a prop into the play screen: a page cannot take props
// from a layout, so the alternative was splitting the play screen into a server
// wrapper and a client body. Context is the pattern this shell already uses
// twice, and the save trigger is not the last thing that will want the session.
export function SessionProvider({
  initialUserId,
  children,
}: {
  initialUserId: string | null;
  children: ReactNode;
}) {
  const [userId, setUserId] = useState(initialUserId);
  const [lastInitialUserId, setLastInitialUserId] = useState(initialUserId);

  // Adjusted during render rather than in an effect, the same way TopNav follows
  // the email it was given. It matters for the cross-tab case: logging in
  // elsewhere fires no event here, so the only signal is the server layout
  // re-rendering with a different user on the next navigation.
  if (initialUserId !== lastInitialUserId) {
    setLastInitialUserId(initialUserId);
    setUserId(initialUserId);
  }

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ userId }), [userId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionUserId(): string | null {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error("useSessionUserId must be used inside a SessionProvider.");
  }
  return value.userId;
}
