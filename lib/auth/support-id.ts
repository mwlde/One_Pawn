// A short handle for an account, shown on the profile and derived from the
// user's UUID at render time. Nothing is stored: the same id always produces
// the same handle, so a support message can be matched back to a row without
// anyone having to read a full UUID down a phone line.
//
// It is an identifier, not a secret, and it is deliberately too short to be
// unique across the whole table. It narrows a search; it does not settle one.

const SUPPORT_ID_LENGTH = 8;

export function formatSupportId(userId: string): string | null {
  const characters = userId.replace(/-/g, "").toUpperCase();
  if (characters.length < SUPPORT_ID_LENGTH) {
    return null;
  }
  return `${characters.slice(0, 4)}-${characters.slice(4, SUPPORT_ID_LENGTH)}`;
}
