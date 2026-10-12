"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { RATING_MAX } from "@/lib/engagement-rules";

/*
 * "Rate this episode": five whole stars at the end of the story. A native
 * radio group (arrow keys work), 48px targets. The filled color is the series
 * color where it has enough contrast on the reader paper, else a fallback
 * (lib/engagement-rules.ts starColors), set per theme through CSS variables.
 * Saves shortly after the last change, so moving through the stars with the
 * keyboard sends one request. The server re-checks everything, including that
 * authors can't rate their own episodes.
 */

type Mode = "rate" | "own" | "signed-out";

const WORDS = ["", "Not for me", "It was okay", "Good", "Really good", "Loved it"];

export default function RatingControl({
  episodeId,
  initialValue,
  mode,
  colors,
}: {
  episodeId: string;
  initialValue: number | null;
  mode: Mode;
  colors: { light: string; dark: string };
}) {
  const name = useId();
  const [value, setValue] = useState<number | null>(initialValue);
  const saved = useRef<number | null>(initialValue);
  const [hover, setHover] = useState<number | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function save(next: number | null) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const request = ++latest.current;
      setStatus({ kind: "saving" });
      try {
        const response = await fetch(`/api/me/ratings/${encodeURIComponent(episodeId)}`, {
          method: next === null ? "DELETE" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: next === null ? undefined : JSON.stringify({ value: next }),
        });
        const data = (await response.json().catch(() => null)) as { value?: number | null; error?: string } | null;
        if (request !== latest.current) return; // a newer choice is on its way
        if (!response.ok) throw new Error(data?.error || "Couldn't save your rating. Please try again.");
        saved.current = data?.value ?? null;
        setStatus({ kind: "saved" });
      } catch (caught) {
        if (request !== latest.current) return;
        setValue(saved.current);
        setStatus({ kind: "error", message: caught instanceof Error ? caught.message : "Couldn't save your rating." });
      }
    }, 350);
  }

  function choose(next: number | null) {
    setValue(next);
    save(next);
  }

  const style = { "--star-fill-light": colors.light, "--star-fill-dark": colors.dark } as CSSProperties;
  const shown = hover ?? value ?? 0;
  const interactive = mode === "rate";

  return (
    <section aria-labelledby={`${name}-heading`} className="rating-stars text-center" style={style}>
      <h2 id={`${name}-heading`} className="reader-kicker">
        Rate this episode
      </h2>

      <fieldset disabled={!interactive} className="mt-3">
        <legend className="sr-only">Your rating, from 1 to {RATING_MAX} stars</legend>
        <div className="inline-flex items-center" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: RATING_MAX }, (_, index) => {
            const star = index + 1;
            return (
              <label
                key={star}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full ${interactive ? "cursor-pointer" : "cursor-default"}`}
                onMouseEnter={() => interactive && setHover(star)}
              >
                <input
                  type="radio"
                  name={name}
                  value={star}
                  checked={value === star}
                  onChange={() => choose(star)}
                  aria-label={`${star} ${star === 1 ? "star" : "stars"}${WORDS[star] ? `, ${WORDS[star]}` : ""}`}
                  className="peer sr-only"
                />
                <Star filled={star <= shown} dim={!interactive} />
                <span aria-hidden className="pointer-events-none absolute inset-1 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--star-fill)]" />
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="reader-meta mt-2 min-h-11 text-sm" aria-live="polite">
        {mode === "own" ? (
          <p>You can&apos;t rate your own episode.</p>
        ) : mode === "signed-out" ? (
          <p>
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(`/episode/${episodeId}`)}`}
              className="inline-flex min-h-11 items-center font-semibold text-[var(--paper-ink)] underline underline-offset-4"
            >
              Sign in to rate
            </Link>
          </p>
        ) : status.kind === "error" ? (
          <p role="alert" className="text-[var(--status-danger)]">
            {status.message}
          </p>
        ) : value ? (
          <p className="flex flex-wrap items-center justify-center gap-x-3">
            <span>
              Your rating: {value} of {RATING_MAX}
              {status.kind === "saving" ? " · Saving…" : status.kind === "saved" ? " · Saved" : ""}
            </span>
            <button
              type="button"
              onClick={() => choose(null)}
              className="inline-flex min-h-11 items-center px-1 underline underline-offset-4 hover:text-[var(--paper-ink)]"
            >
              Clear
            </button>
          </p>
        ) : (
          <p>{status.kind === "saved" ? "Rating cleared." : "Tap a star to rate."}</p>
        )}
      </div>
    </section>
  );
}

function Star({ filled, dim }: { filled: boolean; dim: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-8 w-8 ${dim ? "opacity-60" : ""}`}
      style={{ color: filled ? "var(--star-fill)" : "var(--paper-muted)" }}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
    </svg>
  );
}
