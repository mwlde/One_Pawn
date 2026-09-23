import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Set a new password · One Pawn",
};

// Where the reset email lands, by way of /auth/callback: that route spends the
// one-time code and writes the session cookies, so by the time this page
// renders the visitor is signed in and updateUser() has a session to act on.
//
// No session means the link was never opened, has expired, was already used, or
// was opened in a different browser from the one that asked for it. All four
// read the same way to the person holding it, so they get one message and a way
// to start again.
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return (
      <div className="w-full max-w-[360px]">
        <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">
          That link has expired
        </h1>
        <p className="mb-6 text-sm text-muted">
          Reset links work once, and only in the browser that asked for them. Ask for a new one and
          open it on this device.
        </p>
        <Link
          href="/auth/reset-password"
          className="block border border-ink bg-ink px-5 py-3.5 text-center text-sm font-semibold text-panel hover:bg-black"
        >
          Send a new link →
        </Link>
        <p className="mt-5 text-center text-xs text-muted">
          <Link href="/login" className="underline hover:text-ink">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return <UpdatePasswordForm />;
}
