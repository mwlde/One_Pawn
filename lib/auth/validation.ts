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

// Registration asks for the address twice, because a typo in it costs the
// account: the confirmation link goes somewhere the user cannot open, and the
// only recovery route is the same broken address. The comparison ignores case
// and surrounding whitespace, since neither changes which mailbox the link
// lands in, and telling someone that two addresses they read as identical do
// not match is worse than letting a stray space through.
export function emailsMatch(email: string, confirmation: string): boolean {
  return email.trim().toLowerCase() === confirmation.trim().toLowerCase();
}

export function validateEmailConfirmation(email: string, confirmation: string): string | null {
  if (confirmation.trim().length === 0) {
    return "Confirm your email address.";
  }
  if (!emailsMatch(email, confirmation)) {
    return "Those email addresses don't match.";
  }
  return null;
}

// Password reset requests always report success to the user, whether or not the
// address has an account, so the only failures worth wording are the ones that
// stop the request being made at all.
export function resetRequestErrorMessage(supabaseMessage: string): string {
  const message = supabaseMessage.toLowerCase();

  if (isRateLimit(message)) {
    return "Too many reset requests. Wait a few minutes and try again.";
  }
  if (message.includes("invalid") && message.includes("email")) {
    return "Enter a valid email address.";
  }
  return "Could not send the reset email. Try again.";
}

export function resendErrorMessage(supabaseMessage: string): string {
  const message = supabaseMessage.toLowerCase();

  if (isRateLimit(message)) {
    return "Another email has already gone out recently. Wait a few minutes before asking again.";
  }
  return "Could not send another email. Try again in a moment.";
}

export function updatePasswordErrorMessage(supabaseMessage: string): string {
  const message = supabaseMessage.toLowerCase();

  // No session to update: the link was already spent, it has expired, or it was
  // opened in a different browser from the one that asked for it.
  if (
    message.includes("auth session missing") ||
    message.includes("session_not_found") ||
    message.includes("session from session_id claim in jwt does not exist")
  ) {
    return "That reset link is no longer valid. Ask for a new one.";
  }
  // Checked before the generic password branch below, which would otherwise
  // answer a reuse complaint with a length requirement the password already meets.
  if (message.includes("should be different")) {
    return "Choose a password you have not used on this account before.";
  }
  if (isRateLimit(message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("password")) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return "Could not update your password. Try again.";
}

// Supabase words its throttling three different ways depending on which limiter
// tripped. "For security purposes" is the one the email endpoints use.
function isRateLimit(message: string): boolean {
  return (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("for security purposes")
  );
}
