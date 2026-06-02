"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";

export default function WriterPolicyAcknowledgment() {
  const router = useRouter();
  const { session, refreshSession } = useAuthSession();
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/become-author", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acknowledged,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message || "We cannot make you an author right now.");
        return;
      }

      await refreshSession();
      router.refresh();
      router.push("/writer-studio");
    } catch (cause) {
      console.error("Author application submission failed:", cause);
      setError("We cannot make you an author right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session?.user) {
    return (
      <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
        <p className="eyebrow">Step 3</p>
        <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
          Apply to write
        </h2>
        <p className="theme-meta mt-4 max-w-2xl text-sm leading-6">
          Sign in first, then come back to submit your writer application.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/sign-in?callbackUrl=/write-with-us"
            className="story-button-primary"
          >
            Sign In to Apply
          </Link>
          <Link href="/explore" className="story-button-secondary">
            Keep Exploring
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
      <p className="eyebrow">Step 3</p>
      <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
        Apply to write
      </h2>
      <p className="theme-meta mt-4 max-w-2xl text-sm leading-6">
        Before entering the writer flow, acknowledge the platform AI policy and
        content transparency expectations.
      </p>

      <form onSubmit={handleApply}>
        <label className="mt-6 flex items-start gap-3 rounded-[20px] border border-[var(--border-color)] px-4 py-4">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-primary)]"
          />
          <span className="theme-body text-sm leading-6">
            I acknowledge the AI authorship policy and will label published work
            honestly.
          </span>
        </label>

        {error && (
          <p className="mt-4 rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!acknowledged || isSubmitting}
            className="story-button-primary disabled:opacity-50"
          >
            {isSubmitting ? "Applying..." : "Apply Now"}
          </button>
          <Link href="/explore" className="story-button-secondary">
            Keep Exploring
          </Link>
        </div>
      </form>
    </section>
  );
}
