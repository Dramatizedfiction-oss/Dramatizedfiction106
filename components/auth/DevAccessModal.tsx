// DEV ONLY - Development Access Modal
// This component provides a modal for entering the development CEO password.
// Remove this component when the main auth system is stable.

"use client";

import { useState } from "react";
import { verifyDevPassword, setDevSession, isDevModeEnabled } from "@/lib/dev-auth";

interface DevAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DevAccessModal({ isOpen, onClose, onSuccess }: DevAccessModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isDevModeEnabled()) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (verifyDevPassword(password)) {
      setDevSession();
      onSuccess();
      onClose();
    } else {
      setError("Incorrect development password.");
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="theme-panel rounded-lg border p-6 w-full max-w-md mx-4">
        <h2 className="theme-heading text-xl font-semibold mb-4">Developer Access</h2>
        <p className="theme-meta text-sm mb-4">
          Enter the development password to unlock CEO mode.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="theme-panel w-full rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-primary)]"
              required
            />
          </label>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 story-button-secondary justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 story-button-primary justify-center disabled:opacity-60"
            >
              {isSubmitting ? "Verifying..." : "Access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}