"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import { markReturningVisitor } from "@/lib/auth/returning-visitor";
import {
  isRegistrationDuplicate,
  loginErrorMessage,
  PASSWORD_MIN_LENGTH,
  registerErrorMessage,
  validateEmail,
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

function Field({
  id,
  label,
  type,
  value,
  autoComplete,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  autoComplete: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] tracking-[0.1em] text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-ink bg-transparent p-3.5 font-mono text-[13px] text-ink placeholder:text-hairline focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </div>
  );
}

export function AuthForm({ mode, returning = false }: { mode: Mode; returning?: boolean }) {
  const router = useRouter();
  const copy = COPY[mode];
  const heading = headingFor(mode, returning);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const fieldError = validateEmail(email) ?? validatePassword(password);
    if (fieldError !== null) {
      setError(fieldError);
      return;
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
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
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
    router.push("/play");
    router.refresh();
  }

  if (checkInbox) {
    return (
      <div className="w-full max-w-[360px]">
        <Toggle mode={mode} />
        <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">Check your email</h1>
        <p className="mb-8 text-sm text-muted">
          If that address can be registered, a confirmation link is on its way. Open it to finish
          setting up your account, then log in.
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
      <Toggle mode={mode} />

      <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.01em]">{heading}</h1>
      <p className="mb-8 text-sm text-muted">{copy.subheading}</p>

      {/* Wireframe S3: the error banner carries a heavier border rather than a
          colour, because the palette has no red in it. */}
      {error !== null && (
        <div role="alert" className="mb-4 border-[1.5px] border-ink bg-panel px-3.5 py-3">
          <div className="mb-1 font-mono text-[9px] tracking-[0.14em] text-ink">✕ {copy.failure}</div>
          <p className="text-xs text-ink">{error}</p>
        </div>
      )}

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
          </div>
        </div>

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
