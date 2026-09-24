"use client";

import { useId, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { deletionConfirmationMatches } from "@/lib/auth/account-deletion";
import { createClient } from "@/lib/supabase/client";

// Where the landing page sends the user afterwards. The query param is the
// whole of the confirmation: it survives the hard navigation below and is gone
// again the moment they go anywhere else.
const AFTER_DELETION = "/?deleted=true";

const INLINE_ACTION =
  "text-xs underline underline-offset-2 text-graphite transition-colors hover:text-ink disabled:no-underline disabled:opacity-50";

// Two steps, like the resign button and the per-game delete, rather than a
// modal. The second step is not another click though: this one cannot be
// undone, so the confirmation is typing the address on the account. A misplaced
// click cannot produce that.
export function DeleteAccount({ email }: { email: string }) {
  const inputId = useId();
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirmed = deletionConfirmationMatches(typed, email);

  function disarm() {
    setArmed(false);
    setTyped("");
    setFailed(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setFailed(false);

    let deleted = false;
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_email: typed }),
      });
      deleted = response.ok;
    } catch {
      deleted = false;
    }

    if (!deleted) {
      setFailed(true);
      setDeleting(false);
      return;
    }

    // The account is gone, so this only drops the cookie holding a token that
    // no longer resolves to anybody. It can fail for exactly that reason, which
    // is not a failure worth showing: the deletion already succeeded.
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Nothing to do about it. The redirect below leaves the app either way.
    }

    // A full document load rather than router.replace(). Every app screen was
    // rendered on the server against a session that has just stopped existing,
    // and the router cache would keep handing those back.
    window.location.replace(AFTER_DELETION);
  }

  return (
    <section className="mt-8 border-t border-rule pt-6">
      <h2 className="font-display text-xl font-medium">Danger zone</h2>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-graphite">
        This will permanently delete your account and all your saved games. This cannot be undone.
      </p>

      {armed ? (
        <div className="mt-4 rounded border border-rule bg-surface p-4">
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs text-graphite"
          >
            Type your email address to confirm
          </label>
          <p className="mb-2 text-sm font-medium text-ink">{email}</p>
          <input
            id={inputId}
            name="confirm-email"
            type="email"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={deleting}
            className="w-full max-w-sm rounded border border-rule bg-surface p-3 text-sm text-ink transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={!confirmed || deleting}
              className={buttonClasses("primary")}
            >
              {deleting ? "Deleting…" : "Confirm deletion"}
            </button>
            <button type="button" onClick={disarm} disabled={deleting} className={INLINE_ACTION}>
              Cancel
            </button>
          </div>

          {failed ? (
            <p role="alert" className="mt-3 text-xs text-ink">
              Your account could not be deleted. It is still here. Try again.
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`${buttonClasses("secondary")} mt-4`}
        >
          Delete account
        </button>
      )}

      {/* An offer, not a step. Somebody deleting an account because something
          is broken should know there is a person to ask, but nothing here
          should read as a reason to pause: the button above is the action. */}
      <p className="mt-4 text-xs text-graphite">
        Need help? Contact{" "}
        <a href="mailto:hello@mwlde.com" className="text-info-text underline underline-offset-2 transition-colors hover:text-ink">
          hello@mwlde.com
        </a>
      </p>
    </section>
  );
}
