"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

type WriterPolicyAcknowledgmentProps = {
  className?: string;
  onAccept?: () => void | Promise<void>;
  signInHref?: string;
  continueHref?: string;
};

const defaultPolicyItems = [
  "You agree to publish original or rights-cleared work only.",
  "You understand that published work may be reviewed for quality and policy compliance.",
  "You agree to keep your account and creator details accurate."
];

export default function WriterPolicyAcknowledgment({
  className = "",
  onAccept,
  signInHref = "/sign-in",
  continueHref = "/become-author"
}: WriterPolicyAcknowledgmentProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canContinue = useMemo(() => accepted && !submitting, [accepted, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!accepted) {
      setError("Please confirm the writer policy before continuing.");
      return;
    }

    if (!onAccept) return;

    try {
      setSubmitting(true);
      await onAccept();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not start the writer application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={[
        "theme-panel w-full rounded-2xl border p-6",
        className
      ].join(" ")}
    >
      <div className="space-y-4">
        <div>
          <p className="eyebrow">
            Writer onboarding
          </p>
          <h2 className="theme-heading mt-2 text-2xl font-semibold">
            Before you apply to write with us
          </h2>
          <p className="theme-meta mt-2 text-sm leading-6">
            Please review the policy below so we can keep the creator program clear,
            consistent, and easy to manage later.
          </p>
        </div>

        <ul className="theme-body space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm">
          {defaultPolicyItems.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="theme-body flex items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--accent-solid)]"
            />
            <span>I have read and agree to the writer policy.</span>
          </label>

          {error && <p className="text-sm text-[var(--status-danger)]">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {onAccept ? (
              <button
                type="submit"
                disabled={!canContinue}
                className="story-button-primary px-5 py-2.5 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Continue"}
              </button>
            ) : (
              <Link
                href={continueHref}
                className={[
                  "px-5 py-2.5",
                  accepted
                    ? "story-button-primary"
                    : "story-button cursor-not-allowed border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)]"
                ].join(" ")}
                aria-disabled={!accepted}
                tabIndex={accepted ? 0 : -1}
              >
                Continue
              </Link>
            )}

            <Link
              href={signInHref}
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}