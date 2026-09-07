"use client";

import { useId, useState } from "react";

import { deletionConfirmationMatches } from "@/lib/auth/account-deletion";
import { createClient } from "@/lib/supabase/client";

// Where the landing page sends the user afterwards. The query param is the
// whole of the confirmation: it survives the hard navigation below and is gone
// again the moment they go anywhere else.
const AFTER_DELETION = "/?deleted=true";

const INLINE_ACTION =
  "font-mono text-[10px] underline underline-offset-2 text-muted hover:text-ink disabled:no-underline disabled:opacity-50";

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
    <section className="mt-10 border-t border-dashed border-hairline pt-6">
      <h2 className="text-base font-semibold">Danger zone</h2>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted">
        This will permanently delete your account and all your saved games. This cannot be undone.
      </p>

      {armed ? (
        <div className="mt-4 border border-ink p-4">
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-mono text-[10px] tracking-[0.1em] text-muted"
          >
            TYPE YOUR EMAIL ADDRESS TO CONFIRM
          </label>
          <p className="mb-2 font-mono text-[13px] text-ink">{email}</p>
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
            className="w-full max-w-sm border border-ink bg-transparent p-3.5 font-mono text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={!confirmed || deleting}
              className="border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold text-panel hover:bg-black disabled:cursor-not-allowed disabled:border-hairline disabled:bg-hairline"
            >
              {deleting ? "Deleting…" : "Confirm deletion"}
            </button>
            <button type="button" onClick={disarm} disabled={deleting} className={INLINE_ACTION}>
              Cancel
            </button>
          </div>

          {failed ? (
            <p role="alert" className="mt-3 font-mono text-[10px] text-ink">
              Your account could not be deleted. It is still here. Try again.
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-4 border border-ink px-5 py-2.5 text-[13px] hover:bg-tint"
        >
          Delete account
        </button>
      )}

      {/* An offer, not a step. Somebody deleting an account because something
          is broken should know there is a person to ask, but nothing here
          should read as a reason to pause: the button above is the action. */}
      <p className="mt-4 font-mono text-[10px] text-muted">
        Need help? Contact{" "}
        <a href="mailto:hello@mwlde.com" className="underline underline-offset-2 hover:text-ink">
          hello@mwlde.com
        </a>
      </p>
    </section>
  );
}
