"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpForm() {
  const router = useRouter();
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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/explore",
    });

    if (!result || result.error) {
      setError("Your account was created, but we couldn't sign you in automatically.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    router.push(result.url || "/explore");
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
          className="theme-panel w-full rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-primary)]"
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
          className="theme-panel w-full rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-primary)]"
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
          className="theme-panel w-full rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-primary)]"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error && (
        <p className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
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

      <p className="theme-meta text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="theme-heading font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
