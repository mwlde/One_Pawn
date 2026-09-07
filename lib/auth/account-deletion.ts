// The confirmation gate for account deletion. One function, used in two places:
// the profile page calls it to decide whether the confirm button is enabled,
// and POST /api/account/delete calls it again before touching the database. The
// client-side call is friction, not security. The server's call is the check.

// Typing your own address is the whole of the gate, so it has to accept an
// address the account owner would recognise as theirs. Surrounding whitespace
// comes from a paste or an autofill, and case is not something a person keeps
// track of in their own email: Supabase stores addresses lowercased, and
// rejecting "Me@Example.com" would refuse the right person for a difference the
// login form does not care about either.
//
// Only those two liberties. No trimming inside the string and no unicode
// folding, so the address still has to be typed out.
export function deletionConfirmationMatches(
  typed: string,
  accountEmail: string | null | undefined,
): boolean {
  if (typeof accountEmail !== "string") return false;

  const expected = accountEmail.trim().toLowerCase();
  // An account with no email on file cannot be confirmed this way. Better to
  // refuse than to let an empty box match an empty expectation.
  if (expected.length === 0) return false;

  return typed.trim().toLowerCase() === expected;
}
