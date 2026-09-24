"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { AuthErrorBanner } from "@/app/(auth)/AuthErrorBanner";
import { Field } from "@/app/(auth)/AuthField";
import { createClient } from "@/lib/supabase/client";
import { markReturningVisitor } from "@/lib/auth/returning-visitor";
import {
  PASSWORD_MIN_LENGTH,
  updatePasswordErrorMessage,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/validation";

// Opening the emailed link already signed this browser in, so there is nowhere
// else to send them afterwards: they arrive at the app with the password they
// have just set.
const AFTER_UPDATE = "/play";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleConfirmPasswordBlur() {
    if (confirmPassword.length === 0) {
      setConfirmPasswordError(null);
      return;
    }
    setConfirmPasswordError(validatePasswordConfirmation(password, confirmPassword));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const fieldError = validatePassword(password);
    if (fieldError !== null) {
      setError(fieldError);
      return;
    }

    // A typo in a new password here locks the account out until another reset,
    // so it is confirmed the same way registration is.
    const mismatch = validatePasswordConfirmation(password, confirmPassword);
    if (mismatch !== null) {
      setConfirmPasswordError(mismatch);
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
      <h1 className="mb-2 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Set a new password</h1>
      <p className="mb-8 text-sm text-graphite">
        Choose a new password. You are signed in once it is saved.
      </p>

      {error !== null && <AuthErrorBanner label="Update failed" message={error} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <Field
              id="password"
              label="New password"
              type="password"
              value={password}
              autoComplete="new-password"
              placeholder="••••••••"
              onChange={(value) => {
                setPassword(value);
                setConfirmPasswordError(null);
              }}
            />
            <p className="mt-2 text-xs text-graphite">
              {PASSWORD_MIN_LENGTH} characters minimum.
            </p>
          </div>

          <Field
            id="confirm-password"
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            error={confirmPasswordError}
            onBlur={handleConfirmPasswordBlur}
            onChange={(value) => {
              setConfirmPassword(value);
              setConfirmPasswordError(null);
            }}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className={`${buttonClasses("primary")} w-full`}
        >
          {pending ? "Working..." : "Save password"}
        </button>
      </form>
    </div>
  );
}
