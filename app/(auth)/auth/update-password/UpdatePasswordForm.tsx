"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthErrorBanner } from "@/app/(auth)/AuthErrorBanner";
import { Field } from "@/app/(auth)/AuthField";
import { createClient } from "@/lib/supabase/client";
import { markReturningVisitor } from "@/lib/auth/returning-visitor";
import {
  PASSWORD_MIN_LENGTH,
  updatePasswordErrorMessage,
  validatePassword,
} from "@/lib/auth/validation";

// Opening the emailed link already signed this browser in, so there is nowhere
// else to send them afterwards: they arrive at the app with the password they
// have just set.
const AFTER_UPDATE = "/play";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const fieldError = validatePassword(password);
    if (fieldError !== null) {
      setError(fieldError);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      // Includes the case where the recovery session has expired between the
      // link being opened and the form being submitted, which reads to the user
      // as the link having gone stale.
      setError(updatePasswordErrorMessage(updateError.message));
      setPending(false);
      return;
    }

    markReturningVisitor();
    router.push(AFTER_UPDATE);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[360px]">
      <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">Set a new password</h1>
      <p className="mb-8 text-sm text-muted">
        Choose a new password. You are signed in once it is saved.
      </p>

      {error !== null && <AuthErrorBanner label="UPDATE FAILED" message={error} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <Field
            id="password"
            label="NEW PASSWORD"
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="••••••••"
            onChange={setPassword}
          />
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            {PASSWORD_MIN_LENGTH} characters minimum.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full border border-ink bg-ink px-5 py-4 text-sm font-semibold text-panel transition-colors hover:bg-black disabled:cursor-not-allowed disabled:border-hairline disabled:bg-hairline"
        >
          {pending ? "Working..." : "Save password →"}
        </button>
      </form>
    </div>
  );
}
