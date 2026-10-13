"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { safeCallbackPath } from "@/lib/safe-callback";

export default function SignUpForm() {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error || "We couldn't create your account.");
      setIsSubmitting(false);
      return;
    }

    await refreshSession();
    router.refresh();
    // Back to where they came from (e.g. the series page's "save progress" link), same-site paths only.
    const callback = new URLSearchParams(window.location.search).get("callbackUrl");
    router.push(callback ? safeCallbackPath(callback) : "/explore");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
          Display Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="ui-input w-full rounded-[18px] px-4 py-3 text-sm"
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="ui-input w-full rounded-[18px] px-4 py-3 text-sm"
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="ui-input w-full rounded-[18px] px-4 py-3 text-sm"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error && (
        <p role="alert" className="ui-alert-error rounded-[18px] px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="story-button-primary w-full justify-center disabled:opacity-60"
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>

      {/* Notice only: no checkbox or birthdate, and registration itself is unchanged. */}
      <p className="theme-meta text-xs leading-5">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2">
          Privacy Policy
        </Link>{" "}
        and confirm you are at least 13.
      </p>

      <p className="theme-meta text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="theme-heading font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
