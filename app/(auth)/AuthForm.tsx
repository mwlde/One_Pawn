"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthErrorBanner } from "@/app/(auth)/AuthErrorBanner";
import { Field } from "@/app/(auth)/AuthField";
import { createClient } from "@/lib/supabase/client";
import { markReturningVisitor } from "@/lib/auth/returning-visitor";
import {
  isRegistrationDuplicate,
  loginErrorMessage,
  MINIMUM_AGE,
  PASSWORD_MIN_LENGTH,
  registerErrorMessage,
  resendErrorMessage,
  validateAgeConfirmation,
  validateEmail,
  validateEmailConfirmation,
  validatePassword,
} from "@/lib/auth/validation";

type Mode = "login" | "register";

const COPY: Record<Mode, { heading: string; subheading: string; cta: string; failure: string }> = {
  login: {
    heading: "Log in",
    subheading: "Sign in to save games and track progress.",
    cta: "Log in",
    failure: "SIGN-IN FAILED",
  },
  register: {
    heading: "Create an account",
    subheading: "Save your games and pick up where you left off.",
    cta: "Create account",
    failure: "REGISTRATION FAILED",
  },
};

// The wireframe's "Welcome back" only makes sense to someone who has been here
// before. A first-time visitor who followed "Log in" from the landing page gets
// the plain heading instead.
function headingFor(mode: Mode, returning: boolean): string {
  return mode === "login" && returning ? "Welcome back" : COPY[mode].heading;
}

function Toggle({ mode }: { mode: Mode }) {
  // Wireframe 04 draws this as a stateful segmented control on a single auth
  // page. Stage E1 is scoped to two routes, so the halves are links and the
  // active half is whichever route is rendering.
  const base = "px-5 py-2.5 text-[13px] transition-colors";
  const active = "bg-ink font-semibold text-panel";
  const inactive = "text-muted hover:bg-tint";

  return (
    <div className="mb-8 inline-flex border border-ink">
      <Link href="/login" aria-current={mode === "login" ? "page" : undefined} className={`${base} ${mode === "login" ? active : inactive}`}>
        Log in
      </Link>
      <Link href="/register" aria-current={mode === "register" ? "page" : undefined} className={`${base} ${mode === "register" ? active : inactive}`}>
        Register
      </Link>
    </div>
  );
}

export function AuthForm({
  mode,
  returning = false,
  initialError = null,
  next = null,
}: {
  mode: Mode;
  returning?: boolean;
  initialError?: string | null;
  // Where to go once signed in, for someone who was bounced here from an
  // auth-gated route. Already validated as a path on this site by the page that
  // read it out of the URL. Null means the default destination.
  next?: string | null;
}) {
  const router = useRouter();
  const copy = COPY[mode];
  const heading = headingFor(mode, returning);

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmEmailError, setConfirmEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  // Seeded rather than assigned, so submitting the form clears whatever the
  // redirect put here instead of leaving a stale banner above a fresh attempt.
  const [error, setError] = useState<string | null>(initialError);
  const [checkInbox, setCheckInbox] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendFailure, setResendFailure] = useState<string | null>(null);

  // On blur rather than on every keystroke: checking as the second address is
  // typed means the field is marked wrong for as long as it is incomplete,
  // which is most of the time someone spends in it.
  function handleConfirmEmailBlur() {
    if (confirmEmail.length === 0) {
      setConfirmEmailError(null);
      return;
    }
    setConfirmEmailError(validateEmailConfirmation(email, confirmEmail));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // The age check is register-only, and runs last so a user who has filled
    // nothing in is told about the empty fields first rather than about the box.
    const fieldError =
      validateEmail(email) ??
      validatePassword(password) ??
      (mode === "register" ? validateAgeConfirmation(ageConfirmed) : null);
    if (fieldError !== null) {
      setError(fieldError);
      return;
    }

    // Shown against the field rather than in the banner. The mismatch is a
    // property of one input, and the input is right there to be corrected.
    if (mode === "register") {
      const mismatch = validateEmailConfirmation(email, confirmEmail);
      if (mismatch !== null) {
        setConfirmEmailError(mismatch);
        return;
      }
    }

    setPending(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(loginErrorMessage(signInError.message));
        setPending(false);
        return;
      }
    } else {
      // Without emailRedirectTo the confirmation link goes to the project's Site
      // URL, which is the landing page: it has no way to spend the code it
      // arrives with, so the account confirms but nobody gets logged in. The
      // origin is read at click time so the same code works on localhost and in
      // production. Both origins have to be listed under Authentication > URL
      // Configuration > Redirect URLs or Supabase drops the parameter.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) {
        setError(registerErrorMessage(signUpError.message));
        setPending(false);
        return;
      }

      // This project requires email confirmation, so signUp returns no session
      // and the new account cannot be used yet. Duplicate signups come back
      // looking identical, by design, so both land on the same screen and
      // neither confirms whether the address already had an account.
      if (data.session === null || isRegistrationDuplicate(data.user?.identities)) {
        setCheckInbox(true);
        setPending(false);
        return;
      }
    }

    // Only once a session exists, so the flag means "someone has signed in on
    // this browser", not "someone once opened the register form".
    markReturningVisitor();

    // refresh() re-runs the server components so the nav picks up the new
    // session, rather than showing "Log in" until the next hard reload.
    router.push(next ?? "/play");
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    setResendFailure(null);

    const supabase = createClient();
    const { error: failure } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (failure) {
      // Deliberately vague. Asking to resend to an address that is already
      // confirmed fails with a message that says so, and repeating it here
      // would tell a stranger which addresses have accounts. Only throttling
      // gets its own wording, because that one is worth waiting out.
      setResendFailure(resendErrorMessage(failure.message));
      setResending(false);
      return;
    }

    setResent(true);
    setResending(false);
  }

  if (checkInbox) {
    return (
      <div className="w-full max-w-[360px]">
        <Toggle mode={mode} />
        <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">Check your email</h1>
        <p className="mb-4 text-sm text-muted">
          We sent a verification link to{" "}
          <span className="font-mono text-[13px] text-ink">{email}</span>. Opening it finishes
          setting up your account and signs you in.
        </p>

        {/* Verification is a step people resent when nobody tells them what it
            buys them. It buys them account recovery, so the note says that. */}
        <p className="mb-6 border border-dashed border-hairline p-3.5 text-xs leading-relaxed text-muted">
          Confirming the address proves it is yours. That is what lets us get you back into your
          account if you forget your password, and it keeps the site free of spam registrations.
        </p>

        <div className="mb-6 border-t border-dashed border-hairline pt-4">
          <p className="font-mono text-[10px] text-muted">Nothing in your inbox?</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Check the spam folder first. The link can take a minute to arrive.
          </p>
          {resent ? (
            <p className="mt-3 font-mono text-[10px] text-ink">
              Sent again to {email}.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="mt-3 border border-ink px-4 py-2.5 text-[13px] hover:bg-tint disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted"
            >
              {resending ? "Sending..." : "Send it again"}
            </button>
          )}
          {resendFailure === null ? null : (
            <p role="alert" className="mt-3 font-mono text-[10px] text-ink">
              ✕ {resendFailure}
            </p>
          )}
        </div>

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
      <Toggle mode={mode} />

      <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">{heading}</h1>
      <p className="mb-8 text-sm text-muted">{copy.subheading}</p>

      {error !== null && <AuthErrorBanner label={copy.failure} message={error} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6 flex flex-col gap-4">
          <Field
            id="email"
            label="EMAIL"
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@domain.com"
            onChange={setEmail}
          />

          {/* A typo here costs the account outright: the confirmation link goes
              to an address the user cannot open, and so does every recovery
              email after it. Client-side only, as the second field is a check
              on the first rather than anything the server needs. */}
          {mode === "register" && (
            <Field
              id="confirm-email"
              label="CONFIRM EMAIL"
              type="email"
              value={confirmEmail}
              autoComplete="email"
              placeholder="you@domain.com"
              error={confirmEmailError}
              onBlur={handleConfirmEmailBlur}
              onChange={(value) => {
                setConfirmEmail(value);
                // Corrections show up as the error clearing, not as the message
                // changing under the cursor. It comes back on blur if it is
                // still wrong.
                setConfirmEmailError(null);
              }}
            />
          )}

          <div>
            <Field
              id="password"
              label="PASSWORD"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              onChange={setPassword}
            />
            {mode === "register" && (
              <p className="mt-1.5 font-mono text-[10px] text-muted">
                {PASSWORD_MIN_LENGTH} characters minimum.
              </p>
            )}
            {mode === "login" && (
              <p className="mt-1.5 text-right">
                <Link
                  href="/auth/reset-password"
                  className="font-mono text-[10px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  Forgot password?
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Above the button rather than below it, so it is read before the
            button is pressed rather than found afterwards in an error. The
            input is not disabled-until-checked: a button that does nothing
            leaves the user guessing, whereas submitting and being told why is
            unambiguous. */}
        {mode === "register" && (
          <div className="mb-6 border border-dashed border-hairline p-3.5">
            <label htmlFor="age-confirmed" className="flex cursor-pointer items-start gap-3">
              <input
                id="age-confirmed"
                name="age-confirmed"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(event) => setAgeConfirmed(event.target.checked)}
                aria-describedby="age-requirement"
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span className="text-[13px] leading-snug text-ink">
                I confirm I am at least {MINIMUM_AGE} years old.{" "}
                <span className="text-muted">(required)</span>
              </span>
            </label>
            <p id="age-requirement" className="mt-2 pl-7 font-mono text-[10px] text-muted">
              One Pawn requires users to be {MINIMUM_AGE} or older.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full border border-ink bg-ink px-5 py-4 text-sm font-semibold text-panel transition-colors hover:bg-black disabled:cursor-not-allowed disabled:border-hairline disabled:bg-hairline"
        >
          {pending ? "Working..." : `${copy.cta} →`}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline hover:text-ink">
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-ink">
              Log in
            </Link>
          </>
        )}
      </p>

      {/* The wireframe's guest escape hatch. Phase 1 plays without an account
          anyway, so this is a live link rather than a promise. */}
      <p className="mt-3 text-center text-xs text-muted">
        or{" "}
        <Link href="/play" className="underline hover:text-ink">
          play as guest
        </Link>
        , no account needed
      </p>
    </div>
  );
}
