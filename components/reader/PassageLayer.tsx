"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Sheet from "@/components/writer-studio/ui/Sheet";
import { COMMENT_MAX_LENGTH, timeAgo } from "@/lib/engagement-rules";
import { PASSAGE_MAX, type PassageAnchor } from "@/lib/text-anchor";
import { COMMENT_ADDED_EVENT, flash, readSelection, type SelectedPassage } from "./passages";

/*
 * Highlights and passage comments in the episode reader (Sweep I).
 *
 * Selecting text inside one paragraph shows a small action bar: "Comment" and
 * "Save with note". On phones the bar is docked at the bottom of the screen
 * (above the safe area), so it never covers the phone's own selection menu,
 * which sits above the text; it waits until the selection settles (400 ms),
 * hides while a finger is down or the page is scrolling, and goes away when
 * the selection clears. On wider screens it floats just above the selection.
 * Passages are one paragraph and up to 300 characters.
 *
 * A paragraph with passage comments shows a small count (server-drawn
 * .passage-count); tapping it opens those comments. Readers can hide the
 * counts in Reading & Appearance (data-passage-markers on <html>).
 */

export type PassageComment = { id: string; block: number; quote: string; body: string; authorName: string; createdAt: string };

type Draft = { kind: "comment" | "save"; anchor: PassageAnchor };

export default function PassageLayer({
  episodeId,
  rootId,
  signedIn,
  comments,
  target,
}: {
  episodeId: string;
  rootId: string;
  signedIn: boolean;
  comments: PassageComment[];
  /** A linked passage (?highlight= / ?passage=): whether it's still in the text. */
  target: { found: boolean; what: "highlight" | "comment" } | null;
}) {
  const [selected, setSelected] = useState<SelectedPassage | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openBlock, setOpenBlock] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; href?: string; linkText?: string } | null>(null);
  const [wide, setWide] = useState(false);
  const touching = useRef(false);
  const scrolling = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  const root = useCallback(() => document.getElementById(rootId), [rootId]);

  // Watch the selection; wait for it to settle, and not while a finger is down or the page scrolls.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncWide = () => setWide(media.matches);
    syncWide();
    media.addEventListener("change", syncWide);

    const evaluate = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const element = root();
        if (!element || touching.current || scrolling.current) return;
        setSelected(readSelection(element, PASSAGE_MAX));
      }, 400);
    };
    const onSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (timer.current) window.clearTimeout(timer.current);
        setSelected(null);
        return;
      }
      evaluate();
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") touching.current = true;
    };
    const onUp = () => {
      touching.current = false;
      evaluate();
    };
    const onScroll = () => {
      if (scrolling.current) window.clearTimeout(scrolling.current);
      scrolling.current = window.setTimeout(() => {
        scrolling.current = null;
        evaluate();
      }, 250);
    };
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      media.removeEventListener("change", syncWide);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", onScroll);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [root]);

  // Comment counts: event delegation on the server-drawn buttons.
  useEffect(() => {
    const element = root();
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(".passage-count");
      if (!button || !element.contains(button)) return;
      event.preventDefault();
      setOpenBlock(Number(button.dataset.passageBlock));
    };
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  }, [root]);

  // While a paragraph's comments are open, its passages are underlined.
  useEffect(() => {
    const element = root();
    if (!element || openBlock === null) return;
    const marks = [...element.querySelectorAll(`[data-block="${openBlock}"] mark.passage-mark`)];
    marks.forEach((mark) => mark.setAttribute("data-active", "true"));
    return () => marks.forEach((mark) => mark.removeAttribute("data-active"));
  }, [openBlock, root]);

  // A linked passage: scroll to it and flash, or say it changed.
  useEffect(() => {
    if (!target) return;
    const element = root();
    const mark = element?.querySelector(".passage-target");
    if (target.found && mark) {
      mark.scrollIntoView({ block: "center" });
      element!.querySelectorAll(".passage-target").forEach(flash);
    } else if (!target.found) {
      setNotice({
        text:
          target.what === "highlight"
            ? "This passage was changed by the writer. Your highlight and note are still in your Library."
            : "This passage was changed by the writer. The comment is still below.",
      });
    }
  }, [target, root]);

  const start = (kind: Draft["kind"]) => {
    if (!selected) return;
    setDraft({ kind, anchor: selected.anchor });
    setSelected(null);
    window.getSelection()?.removeAllRanges();
  };

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(`/episode/${episodeId}`)}`;
  const blockComments = openBlock === null ? [] : comments.filter((comment) => comment.block === openBlock);

  const bar = selected ? (
    <div
      role="toolbar"
      aria-label="Passage actions"
      className={
        wide
          ? "passage-bar fixed z-40 -translate-x-1/2 -translate-y-full"
          : "passage-bar fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      }
      style={wide ? { top: Math.max(64, selected.rect.top - 10), left: Math.min(Math.max(140, selected.rect.left + selected.rect.width / 2), window.innerWidth - 140) } : undefined}
    >
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-1.5 shadow-2xl">
        {selected.tooLong ? (
          <p className="px-4 py-2 text-sm text-[var(--text-secondary)]">Shorten your selection to {PASSAGE_MAX} characters or fewer.</p>
        ) : signedIn ? (
          <>
            <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => start("comment")} className="story-button-primary min-h-11 flex-1">
              Comment
            </button>
            <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => start("save")} className="story-button-secondary min-h-11 flex-1">
              Save with note
            </button>
          </>
        ) : (
          <Link href={signInHref} className="story-button-primary min-h-11 flex-1 justify-center">
            Sign in to comment or save
          </Link>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {bar}
      {notice ? (
        <div role="status" className="passage-bar fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-3 text-sm shadow-2xl">
            <p className="min-w-0 flex-1 text-[var(--text-primary)]">
              {notice.text}{" "}
              {notice.href ? (
                <Link href={notice.href} className="font-semibold underline underline-offset-4">
                  {notice.linkText}
                </Link>
              ) : null}
            </p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--panel-hover)]">
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {draft ? (
        <PassageComposer
          episodeId={episodeId}
          draft={draft}
          onClose={() => setDraft(null)}
          onDone={(text, href, linkText) => {
            setDraft(null);
            setNotice({ text, href, linkText });
          }}
        />
      ) : null}

      <Sheet open={openBlock !== null} title="Comments on this paragraph" onRequestClose={() => setOpenBlock(null)}>
        <ul className="space-y-5">
          {blockComments.map((comment) => (
            <li key={comment.id}>
              <blockquote className="passage-quote">{comment.quote}</blockquote>
              <p className="mt-2 text-sm">
                <span className="font-semibold text-[var(--text-primary)]">{comment.authorName}</span>
                <span className="theme-meta"> · {timeAgo(comment.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-[0.975rem] leading-7 text-[var(--text-primary)]">{comment.body}</p>
              <button
                type="button"
                onClick={() => {
                  setOpenBlock(null);
                  const item = document.getElementById(`comment-${comment.id}`);
                  if (item) {
                    item.scrollIntoView({ block: "center" });
                    flash(item);
                  }
                }}
                className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4"
              >
                Show in comments
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

function PassageComposer({
  episodeId,
  draft,
  onClose,
  onDone,
}: {
  episodeId: string;
  draft: Draft;
  onClose: () => void;
  onDone: (text: string, href?: string, linkText?: string) => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isComment = draft.kind === "comment";
  const canSend = isComment ? text.trim().length > 0 : true;

  async function submit() {
    if (!canSend || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(isComment ? "/api/comments" : "/api/me/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isComment ? { episodeId, body: text, passage: draft.anchor } : { episodeId, passage: draft.anchor, note: text.trim() ? text : null }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; comment?: unknown } | null;
      if (!response.ok) throw new Error(data?.error || "That didn't work. Please try again.");
      if (isComment) {
        window.dispatchEvent(new CustomEvent(COMMENT_ADDED_EVENT, { detail: { comment: data?.comment, created: response.status === 201 } }));
        onDone("Posted. Your comment is in the comments below.");
      } else {
        onDone("Saved to your Library.", "/reader?shelf=highlights", "See your highlights");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      open
      title={isComment ? "Comment on this passage" : "Save with a note"}
      onRequestClose={() => (pending ? undefined : onClose())}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error ? (
            <p role="alert" className="mr-auto text-sm text-[var(--status-danger)]">
              {error}
            </p>
          ) : null}
          <button type="button" onClick={onClose} disabled={pending} className="story-button-secondary min-h-11">
            Cancel
          </button>
          <button type="button" onClick={() => void submit()} disabled={!canSend || pending} className="story-button-primary min-h-11 disabled:opacity-50">
            {pending ? (isComment ? "Posting…" : "Saving…") : isComment ? "Post" : "Save"}
          </button>
        </div>
      }
    >
      <blockquote className="passage-quote">{draft.anchor.quote}</blockquote>
      <label className="mt-4 block">
        <span className="theme-heading mb-1 block text-sm font-semibold">{isComment ? "Your comment" : "Note (optional, only you see it)"}</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          rows={4}
          autoFocus
          placeholder={isComment ? "What do you think of this part?" : "Why you saved it…"}
          className="ui-input block w-full resize-none px-4 py-3 text-base leading-6"
        />
      </label>
      {text.length > COMMENT_MAX_LENGTH - 100 ? (
        <p className="theme-meta mt-1 text-right text-xs">
          {text.length.toLocaleString()}/{COMMENT_MAX_LENGTH.toLocaleString()}
        </p>
      ) : null}
      <p className="theme-meta mt-3 text-xs">
        {isComment ? "Comments are public and follow the community guidelines." : "Highlights are private: they show only in your Library."}
      </p>
    </Sheet>
  );
}
