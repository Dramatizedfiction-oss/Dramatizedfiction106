"use client";

import { useId, useState, type FormEvent } from "react";
import { PasswordField } from "@/components/settings/AccountForms";
import { DELETE_CONFIRMATION_WORD } from "@/lib/account-rules";

/** Password + typed DELETE; the button stays disabled until both are filled. */
export default function DeleteAccountForm() {
  const id = useId();
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ready = password.length > 0 && word === DELETE_CONFIRMATION_WORD;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/me/account", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmation: word }),
    }).catch(() => null);
    if (response?.ok) {
      // A full load resets every bit of signed-in state in the browser.
      window.location.assign("/");
      return;
    }
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error || "Couldn't delete your account. Please try again.");
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PasswordField label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
      <div>
        <label htmlFor={id} className="theme-heading mb-2 block text-sm font-semibold">
          Type <span className="font-mono-df">{DELETE_CONFIRMATION_WORD}</span> to confirm
        </label>
        <input
          id={id}
          value={word}
          onChange={(event) => setWord(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="ui-input min-h-11 w-full px-4 font-mono-df text-base tracking-[0.2em] sm:text-sm"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!ready || pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--status-danger)] px-5 text-sm font-semibold text-[var(--on-status-danger)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-danger)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {pending ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
