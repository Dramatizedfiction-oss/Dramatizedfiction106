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
  signInHref = "/login",
  continueHref = "/writer"
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
        "w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-black/20",
        className
      ].join(" ")}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Writer onboarding
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Before you apply to write with us
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Please review the policy below so we can keep the creator program clear,
            consistent, and easy to manage later.
          </p>
        </div>

        <ul className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
          {defaultPolicyItems.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500"
            />
            <span>I have read and agree to the writer policy.</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {onAccept ? (
              <button
                type="submit"
                disabled={!canContinue}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Continue"}
              </button>
            ) : (
              <Link
                href={continueHref}
                className={[
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                  accepted
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "cursor-not-allowed bg-slate-800 text-slate-500"
                ].join(" ")}
                aria-disabled={!accepted}
                tabIndex={accepted ? 0 : -1}
              >
                Continue
              </Link>
            )}

            <Link
              href={signInHref}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}