"use client";

import { useState } from "react";

// The labelled input used by every auth screen: log in, register, request a
// reset, set a new password. It lived inside AuthForm until the reset screens
// needed the same field, and moved here unchanged rather than being copied.
//
// The palette has no red in it, so an invalid field is marked the way the error
// banner is marked: a heavier border, plus the message underneath.
//
// A password field carries a Show/Hide toggle. A masked field is where a typo
// hides, and the confirm field only catches a mismatch, not the same mistake
// made twice, so being able to read back what was typed is the real safeguard.
export function Field({
  id,
  label,
  type,
  value,
  autoComplete,
  placeholder,
  onChange,
  onBlur,
  error = null,
  disabled = false,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  autoComplete: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs text-graphite">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? undefined : errorId}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`w-full rounded border bg-surface p-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50 ${
            isPassword ? "pr-12" : ""
          } ${error === null ? "border-rule hover:border-rule-strong" : "border-ink"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 text-xs text-graphite transition-colors hover:text-ink"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error === null ? null : (
        <p id={errorId} className="mt-2 text-xs text-ink">
          ✕ {error}
        </p>
      )}
    </div>
  );
}
