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
  const [panelLeft, setPanelLeft] = useState(0);
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
          // Place the panel under the button, nudged so it stays 16px inside the screen.
          const anchor = ref.current?.getBoundingClientRect();
          if (anchor) {
            const width = Math.min(280, window.innerWidth - 32);
            const preferred = anchor.right - width;
            const clamped = Math.min(Math.max(preferred, 16), window.innerWidth - 16 - width);
            setPanelLeft(clamped - anchor.left);
          }
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        className={`inline-flex min-h-9 items-center text-left text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] ${
          compact ? "text-[11px] uppercase tracking-[0.22em]" : "text-xs"
        }`}
      >
        Report incorrect AI tag
      </button>

      {open && (
        <div
          className="theme-panel absolute top-full z-40 mt-2 w-[min(280px,calc(100vw-2rem))] rounded-[20px] border border-[var(--border-color)] p-4 shadow-2xl"
          style={{ left: panelLeft }}
        >
          <p className="theme-heading text-sm font-semibold">Admin queue placeholder</p>
          <p className="theme-meta mt-2 text-xs leading-5">
            Flagging {subject} will send a UI-only trust report to the future moderation queue.
          </p>

          {submitted ? (
            <p className="theme-meta mt-3 text-xs">
              Thanks. Reporting isn&apos;t connected yet, so nothing was sent.
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
