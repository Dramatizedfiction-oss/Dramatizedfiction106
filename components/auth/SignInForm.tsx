"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { safeCallbackPath, withCallback } from "@/lib/safe-callback";

export const NETWORK_ERROR = "We couldn't reach Dramatized Fiction. Check your connection and try again.";
export const SERVER_ERROR = "Something went wrong on our side. Please try again in a moment.";

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

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
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
    } catch {
      // Offline or the request never finished: say so instead of staying on "Signing in...".
      setError(NETWORK_ERROR);
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      // A server fault (5xx, no JSON) isn't a wrong password: don't say it is.
      setError(payload?.error || (response.status >= 500 ? SERVER_ERROR : "We couldn't sign you in with those credentials."));
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
            enterKeyHint="next"
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
            enterKeyHint="go"
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
          <Link href={withCallback("/sign-up", searchParams.get("callbackUrl"))} className="theme-heading -my-3.5 inline-block py-3.5 font-medium">
            Create an account
          </Link>
        </p>
      </form>
  );
}
