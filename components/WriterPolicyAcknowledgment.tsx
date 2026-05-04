"use client";

import Link from "next/link";
import { useState } from "react";

export default function WriterPolicyAcknowledgment() {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
      <p className="eyebrow">Step 3</p>
      <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
        Apply to write
      </h2>
      <p className="theme-meta mt-4 max-w-2xl text-sm leading-6">
        Before entering the writer flow, acknowledge the platform AI policy and content transparency expectations.
      </p>

      <label className="mt-6 flex items-start gap-3 rounded-[20px] border border-[var(--border-color)] px-4 py-4">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-primary)]"
        />
        <span className="theme-body text-sm leading-6">
          I acknowledge the AI authorship policy and will label published work honestly.
        </span>
      </label>

      <div className="mt-6 flex flex-wrap gap-3">
        {acknowledged ? (
          <Link
            href="/api/auth/signin?callbackUrl=/writer"
            className="story-button-primary"
          >
            Apply Now
          </Link>
        ) : (
          <button type="button" disabled className="story-button-primary opacity-50">
            Apply Now
          </button>
        )}
        <Link href="/explore" className="story-button-secondary">
          Keep Exploring
        </Link>
      </div>
    </section>
  );
}
