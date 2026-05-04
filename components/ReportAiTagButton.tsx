"use client";

import { useEffect, useRef, useState } from "react";

export default function ReportAiTagButton({
  subject,
  compact = false,
}: {
  subject: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSubmitted(false);
          setOpen((value) => !value);
        }}
        className={`text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] ${
          compact ? "text-[11px] uppercase tracking-[0.22em]" : "text-xs"
        }`}
      >
        Report incorrect AI tag
      </button>

      {open && (
        <div className="theme-panel absolute right-0 top-full z-40 mt-2 w-[280px] rounded-[20px] border border-[var(--border-color)] p-4 shadow-2xl">
          <p className="theme-heading text-sm font-semibold">Admin queue placeholder</p>
          <p className="theme-meta mt-2 text-xs leading-5">
            Flagging {subject} will send a UI-only trust report to the future moderation queue.
          </p>

          {submitted ? (
            <p className="theme-meta mt-3 text-xs">
              Report queued for admin review.
            </p>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSubmitted(true);
              }}
              className="story-button-secondary mt-4 w-full justify-center text-xs"
            >
              Send placeholder report
            </button>
          )}
        </div>
      )}
    </div>
  );
}
