"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { safeCallbackPath } from "@/lib/safe-callback";

export default function SignInForm() {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const searchParams = useSearchParams();
  // Only same-origin paths are honoured; anything else falls back to /explore.
  const callbackUrl = useMemo(
    () => safeCallbackPath(searchParams.get("callbackUrl")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error || "We couldn't sign you in with those credentials.");
      setIsSubmitting(false);
      return;
    }

    await refreshSession();
    router.refresh();
    router.push(callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
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
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="theme-meta text-sm">
          New here?{" "}
          <Link href="/sign-up" className="theme-heading font-medium">
            Create an account
          </Link>
        </p>
      </form>
  );
}
