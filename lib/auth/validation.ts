// Client-side form validation and Supabase error copy for the auth screens.
// Pure functions, kept out of the components so they can be unit tested without
// a DOM. The server is still the authority: this only spares the user a round
// trip on mistakes the browser can catch on its own.

export const PASSWORD_MIN_LENGTH = 12;

// One number, applied everywhere. The terms and the privacy policy both promise
// 16 with no regional variation, so there is nothing to look up per visitor.
export const MINIMUM_AGE = 16;

// The registration form makes the user tick a box confirming their age. This is
// a self-declaration, not verification: nothing here can tell whether it is
// true. It exists so the requirement is stated before an account is made rather
// than only in a document nobody opened, and so an underage account is a broken
// promise rather than something One Pawn never asked about.
export function validateAgeConfirmation(confirmed: boolean): string | null {
  if (!confirmed) {
    return `Confirm you are at least ${MINIMUM_AGE} years old to create an account.`;
  }
  return null;
}

// Length only, deliberately. Composition rules (a digit, a symbol, mixed case)
// push people towards predictable substitutions and shorter passwords, which is
// why NIST dropped them. Length is the requirement worth enforcing.
export function validatePassword(password: string): string | null {
  if (password.length === 0) {
    return "Enter a password.";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (email.trim().length === 0) {
    return "Enter your email address.";
  }
  return null;
}

// Supabase's own error strings are not user-facing copy, so they are mapped
// here. Anything unrecognised falls back to a neutral message rather than
// leaking a raw API error into the UI.
export function loginErrorMessage(supabaseMessage: string): string {
  const message = supabaseMessage.toLowerCase();

  // One message for a wrong password and for an address that was never
  // registered. Telling them apart would turn the login form into an account
  // enumeration oracle.
  if (message.includes("invalid login credentials")) {
    return "Email or password doesn't match.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email address before logging in. Check your inbox for the link.";
  }
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Could not log you in. Try again.";
}

export function registerErrorMessage(supabaseMessage: string): string {
  const message = supabaseMessage.toLowerCase();

  // Only reachable when the project has email confirmation switched off. With
  // confirmation on, Supabase hides duplicate signups behind an ordinary
  // success response instead, which isRegistrationDuplicate() detects.
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Email already registered. Log in instead.";
  }
  if (message.includes("password")) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (message.includes("invalid") && message.includes("email")) {
    return "Enter a valid email address.";
  }
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Could not create your account. Try again.";
}

// With email confirmation on, signing up with an address that already exists
// returns a success response carrying a decoy user and no identities. Treating
// that as a normal "check your inbox" outcome is what keeps the register form
// from confirming which addresses have accounts.
export function isRegistrationDuplicate(identities: unknown[] | null | undefined): boolean {
  return Array.isArray(identities) && identities.length === 0;
}
