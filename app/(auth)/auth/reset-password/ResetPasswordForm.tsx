"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthErrorBanner } from "@/app/(auth)/AuthErrorBanner";
import { Field } from "@/app/(auth)/AuthField";
import { createClient } from "@/lib/supabase/client";
import { resetRequestErrorMessage, validateEmail } from "@/lib/auth/validation";

// Where the emailed link lands. The code it carries can only be exchanged for a
// session in a route handler, so it goes through the same callback the
// confirmation email uses and that route forwards to the form below. The origin
// is read at click time so one build works on localhost and in production; both
// origins have to be listed under Authentication > URL Configuration >
// Redirect URLs in Supabase or the parameter is dropped.
const UPDATE_PASSWORD_PATH = "/auth/update-password";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const fieldError = validateEmail(email);
    if (fieldError !== null) {
      setError(fieldError);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(UPDATE_PASSWORD_PATH)}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetRequestErrorMessage(resetError.message));
      setPending(false);
      return;
    }

    // Supabase answers the same way whether or not the address has an account,
    // and so does this screen. Saying "no account with that address" here would
    // turn the reset form into the account enumeration oracle the login form is
    // careful not to be.
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <div className="w-full max-w-[360px]">
        <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">Check your email</h1>
        <p className="mb-6 text-sm text-muted">
          Check your email for a link to reset your password. If you don&apos;t see it, check your
          spam folder.
        </p>
        <p className="mb-6 border border-dashed border-hairline p-3.5 text-xs leading-relaxed text-muted">
          The link works once and then expires. If it stops working, come back here and ask for a
          new one.
        </p>
        <Link
          href="/login"
          className="block border border-ink px-5 py-3.5 text-center text-sm hover:bg-tint"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px]">
      <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">Reset your password</h1>
      <p className="mb-8 text-sm text-muted">
        Enter the address on your account. We will email you a link to set a new password.
      </p>

      {error !== null && <AuthErrorBanner label="RESET FAILED" message={error} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <Field
            id="email"
            label="EMAIL"
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@domain.com"
            onChange={setEmail}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full border border-ink bg-ink px-5 py-4 text-sm font-semibold text-panel transition-colors hover:bg-black disabled:cursor-not-allowed disabled:border-hairline disabled:bg-hairline"
        >
          {pending ? "Working..." : "Send reset link →"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        Remembered it?{" "}
        <Link href="/login" className="underline hover:text-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
