"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { displayedAiTag } from "@/lib/ai-tag-banner";
import { AI_USAGE_OPTIONS } from "@/lib/ai-usage";

/*
 * "Report incorrect AI tag": a small panel that sends a real report to
 * Administration > Reports (AI tags) via POST /api/reports/ai-tag. The member
 * says what they think the tag should be (or "Not sure") and can add a note.
 * Signed-out visitors are asked to sign in. The server checks everything
 * again (published content only, not your own story, one open report each).
 */
export default function ReportAiTagButton({
  target,
  currentTag,
  subject,
  compact = false,
  underline = false,
}: {
  /** What is reported: a series, or one of its episodes. */
  target: { seriesId?: string; episodeId?: string };
  currentTag?: string | null;
  subject: string;
  compact?: boolean;
  /** Underline the trigger so it reads as a link. */
  underline?: boolean;
}) {
  const { status } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const name = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; message?: string }>({ kind: "idle" });
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const current = displayedAiTag(currentTag);

  // The panel is portalled to <body> (it can't live inside a card that is a
  // link, or its radio buttons would follow the link), positioned under the button.
  function place() {
    const anchor = ref.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(300, window.innerWidth - 32);
    const left = Math.min(Math.max(anchor.right - width, 16), window.innerWidth - 16 - width);
    setPosition({ top: anchor.bottom + 8, left, width });
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      const node = event.target as Node;
      if (!ref.current?.contains(node) && !panelRef.current?.contains(node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  async function send() {
    if (!choice || state.kind === "sending") return;
    setState({ kind: "sending" });
    const response = await fetch("/api/reports/ai-tag", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(target.episodeId ? { episodeId: target.episodeId } : { seriesId: target.seriesId }),
        // The stored form of a tag ("AI HEAVY" -> "AI_HEAVY"); "unsure" sends null.
        suggestedTag: choice === "unsure" ? null : choice.replaceAll(" ", "_"),
        ...(note.trim() ? { note } : {}),
      }),
    }).catch(() => null);
    if (response?.ok) {
      setState({ kind: "sent" });
      return;
    }
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setState({ kind: "error", message: payload?.error || "Couldn't send the report. Please try again." });
  }

  if (!target.seriesId && !target.episodeId) return null;

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (state.kind !== "sent") setState({ kind: "idle" });
          place();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        className={`inline-flex items-center text-left text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] ${
          // 44px tap target, except inside compact series cards where space is tight.
          compact ? "min-h-9 text-[11px] uppercase tracking-[0.22em]" : "min-h-11 text-xs"
        } ${underline ? "min-h-11 underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:decoration-2" : ""}`}
      >
        Report incorrect AI tag
      </button>

      {open && position
        ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Report the AI tag of ${subject}`}
          className="theme-panel fixed z-[70] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[20px] border border-[var(--border-color)] p-4 text-left shadow-2xl"
          style={{ top: Math.min(position.top, window.innerHeight - 120), left: position.left, width: position.width }}
        >
          {status !== "authenticated" ? (
            <>
              <p className="theme-heading text-sm font-semibold">Sign in to report</p>
              <p className="theme-meta mt-1 text-xs leading-5">Reports go to our moderators, so we ask you to be signed in.</p>
              {/* A button, not a link: this panel can sit inside a card that is itself a link. */}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname || "/")}`);
                }}
                className="story-button-primary mt-3 min-h-11 w-full justify-center text-sm"
              >
                Sign in
              </button>
            </>
          ) : state.kind === "sent" ? (
            <p role="status" className="theme-body text-sm leading-6">
              Thanks. Our moderators will review the AI tag of {subject}.
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <p className="theme-heading text-sm font-semibold">Report the AI tag</p>
              <p className="theme-meta mt-1 text-xs leading-5">
                {current ? (
                  <>
                    Tagged <span className="font-semibold text-[var(--text-primary)]">{current}</span>.{" "}
                  </>
                ) : null}
                What should it be?
              </p>
              <fieldset className="mt-2">
                <legend className="sr-only">Suggested AI tag</legend>
                {[...AI_USAGE_OPTIONS.filter((option) => option !== current), "unsure"].map((option) => (
                  <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--text-primary)]">
                    <input
                      type="radio"
                      name={name}
                      value={option}
                      checked={choice === option}
                      onChange={() => setChoice(option)}
                      className="h-5 w-5 accent-[var(--accent-solid)]"
                    />
                    {option === "unsure" ? "Not sure, but it looks wrong" : option}
                  </label>
                ))}
              </fieldset>
              <label className="mt-2 block">
                <span className="theme-meta text-xs">Anything moderators should know? (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={2}
                  className="ui-input mt-1 block w-full resize-none px-3 py-2 text-base"
                />
              </label>
              {state.kind === "error" ? (
                <p role="alert" className="mt-2 text-xs text-[var(--status-danger)]">
                  {state.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={!choice || state.kind === "sending"}
                className="story-button-primary mt-3 min-h-11 w-full justify-center text-sm disabled:opacity-50"
              >
                {state.kind === "sending" ? "Sending…" : "Send report"}
              </button>
            </form>
          )}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
