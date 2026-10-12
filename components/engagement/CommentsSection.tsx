"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import type { CommentView } from "@/lib/comments";
import { COMMENT_MAX_LENGTH, REPORT_NOTE_MAX_LENGTH, REPORT_REASONS, timeAgo } from "@/lib/engagement-rules";

/*
 * Episode comments: composer, newest-first list with "Show more", and a ⋯
 * menu per comment (Edit/Delete your own; Report someone else's; Remove for
 * the series author and Board/CEO). Bodies are plain text: React escapes them
 * and line breaks are kept with whitespace-pre-line. Every action is
 * re-checked on the server; the menu only offers what the server would allow.
 */

type Viewer = { id: string; isSeriesAuthor: boolean; isModerator: boolean } | null;

export default function CommentsSection({
  episodeId,
  initial,
  viewer,
}: {
  episodeId: string;
  initial: { comments: CommentView[]; total: number; nextCursor: string | null };
  viewer: Viewer;
}) {
  const headingId = useId();
  const [comments, setComments] = useState(initial.comments);
  const [total, setTotal] = useState(initial.total);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/comments?episodeId=${encodeURIComponent(episodeId)}&cursor=${encodeURIComponent(cursor)}`);
      const data = (await response.json().catch(() => null)) as
        | { comments?: CommentView[]; total?: number; nextCursor?: string | null; error?: string }
        | null;
      if (!response.ok || !data?.comments) throw new Error(data?.error || "Couldn't load more comments.");
      const seen = new Set(comments.map((comment) => comment.id));
      setComments((current) => [...current, ...data.comments!.filter((comment) => !seen.has(comment.id))]);
      setCursor(data.nextCursor ?? null);
      if (typeof data.total === "number") setTotal(data.total);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Couldn't load more comments.");
    } finally {
      setLoadingMore(false);
    }
  }

  function added(comment: CommentView, created: boolean) {
    if (comments.some((existing) => existing.id === comment.id)) return;
    setComments((current) => [comment, ...current]);
    if (created) setTotal((value) => value + 1);
  }

  function replaced(comment: CommentView) {
    setComments((current) => current.map((existing) => (existing.id === comment.id ? comment : existing)));
  }

  function gone(id: string) {
    setComments((current) => current.filter((comment) => comment.id !== id));
    setTotal((value) => Math.max(0, value - 1));
  }

  return (
    <section aria-labelledby={headingId} className="text-left">
      <h2 id={headingId} className="font-heading text-2xl font-semibold text-[var(--paper-ink)]">
        Comments{total > 0 ? <span className="reader-meta ml-2 text-base font-normal">({total.toLocaleString()})</span> : null}
      </h2>

      {viewer ? (
        <Composer episodeId={episodeId} onPosted={added} />
      ) : (
        <div className="mt-4 rounded-2xl border border-[var(--paper-rule)] px-4 py-5 text-center">
          <p className="reader-meta text-sm">Join the conversation about this episode.</p>
          <Link
            href={`/sign-in?callbackUrl=${encodeURIComponent(`/episode/${episodeId}`)}`}
            className="story-button-primary mt-3 inline-flex min-h-11"
          >
            Sign in to comment
          </Link>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="reader-meta mt-6 text-center text-sm">No comments yet. Be the first.</p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--paper-rule)] border-t border-[var(--paper-rule)]">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} viewer={viewer} onEdited={replaced} onGone={gone} />
          ))}
        </ul>
      )}

      {cursor ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="story-button-secondary min-h-11 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Show more comments"}
          </button>
        </div>
      ) : null}
      {loadError ? (
        <p role="alert" className="mt-2 text-center text-sm text-[var(--status-danger)]">
          {loadError}
        </p>
      ) : null}
    </section>
  );
}

function CommentTextarea({
  value,
  onChange,
  label,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={COMMENT_MAX_LENGTH}
      rows={2}
      aria-label={label}
      disabled={disabled}
      placeholder="Share your thoughts…"
      className="ui-input block w-full resize-none px-4 py-3 text-base leading-6"
    />
  );
}

function Counter({ length }: { length: number }) {
  if (length < COMMENT_MAX_LENGTH - 100) return null;
  return (
    <span className={`text-xs ${length >= COMMENT_MAX_LENGTH ? "text-[var(--status-danger)]" : "reader-meta"}`}>
      {length.toLocaleString()}/{COMMENT_MAX_LENGTH.toLocaleString()}
    </span>
  );
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

function Composer({ episodeId, onPosted }: { episodeId: string; onPosted: (comment: CommentView, created: boolean) => void }) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = body.trim().length === 0;

  async function submit() {
    if (empty || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, body }),
      });
      if (!response.ok) throw new Error(await readError(response, "Couldn't post your comment. Please try again."));
      const data = (await response.json()) as { comment: CommentView };
      onPosted(data.comment, response.status === 201);
      setBody("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't post your comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <CommentTextarea value={body} onChange={setBody} label="Write a comment" disabled={pending} />
      <div className="mt-2 flex items-center justify-end gap-3">
        <Counter length={body.length} />
        <button type="submit" disabled={empty || pending} className="story-button-primary min-h-11 disabled:opacity-50">
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type Panel = "none" | "menu" | "edit" | "report" | "reported";

function CommentItem({
  comment,
  viewer,
  onEdited,
  onGone,
}: {
  comment: CommentView;
  viewer: Viewer;
  onEdited: (comment: CommentView) => void;
  onGone: (id: string) => void;
}) {
  const own = viewer?.id === comment.author.id;
  const canRemove = Boolean(viewer && !own && (viewer.isSeriesAuthor || viewer.isModerator));
  const canReport = Boolean(viewer && !own);
  const hasMenu = own || canRemove || canReport;

  const [panel, setPanel] = useState<Panel>("none");
  const [draft, setDraft] = useState(comment.body);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel !== "menu") return;
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menuRef.current?.contains(event.target as Node)) {
        setPanel("none");
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [panel]);

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const saveEdit = () =>
    run(async () => {
      const response = await fetch(`/api/comments/${encodeURIComponent(comment.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      if (!response.ok) throw new Error(await readError(response, "Couldn't save your edit."));
      onEdited(((await response.json()) as { comment: CommentView }).comment);
      setPanel("none");
    });

  const remove = (question: string) => {
    setPanel("none");
    if (!window.confirm(question)) return;
    void run(async () => {
      const response = await fetch(`/api/comments/${encodeURIComponent(comment.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Couldn't remove the comment."));
      onGone(comment.id);
    });
  };

  const name = comment.author.name || "Reader";

  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <Link href={`/reader/${comment.author.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
          <UserAvatar user={comment.author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm leading-6">
              <Link href={`/reader/${comment.author.id}`} className="font-semibold text-[var(--paper-ink)] hover:underline">
                {name}
              </Link>
              <span className="reader-meta">
                {" "}
                · <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
                {comment.editedAt ? " · edited" : ""}
              </span>
            </p>
            {hasMenu ? (
              <div ref={menuRef} className="relative -mr-2 -mt-2 shrink-0">
                <button
                  type="button"
                  aria-label={`Actions for ${name}'s comment`}
                  aria-haspopup="menu"
                  aria-expanded={panel === "menu"}
                  onClick={() => setPanel(panel === "menu" ? "none" : "menu")}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--paper-muted)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--paper-ink)]"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <circle cx="4.5" cy="10" r="1.6" />
                    <circle cx="10" cy="10" r="1.6" />
                    <circle cx="15.5" cy="10" r="1.6" />
                  </svg>
                </button>
                {panel === "menu" ? (
                  <div
                    role="menu"
                    className="theme-panel absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-2xl border border-[var(--border-color)] py-1 shadow-2xl"
                  >
                    {own ? (
                      <>
                        <MenuItem
                          onClick={() => {
                            setDraft(comment.body);
                            setPanel("edit");
                          }}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem danger onClick={() => remove("Delete your comment? This can't be undone.")}>
                          Delete
                        </MenuItem>
                      </>
                    ) : null}
                    {canReport ? <MenuItem onClick={() => setPanel("report")}>Report</MenuItem> : null}
                    {canRemove ? (
                      <MenuItem danger onClick={() => remove(`Remove ${name}'s comment? Readers won't see it any more.`)}>
                        Remove
                      </MenuItem>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {panel === "edit" ? (
            <div className="mt-2">
              <CommentTextarea value={draft} onChange={setDraft} label="Edit your comment" autoFocus disabled={pending} />
              <div className="mt-2 flex items-center justify-end gap-3">
                <Counter length={draft.length} />
                <button type="button" onClick={() => setPanel("none")} className="story-button-secondary min-h-11">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={pending || draft.trim().length === 0}
                  className="story-button-primary min-h-11 disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-line break-words text-[0.975rem] leading-7 text-[var(--paper-ink)]">{comment.body}</p>
          )}

          {panel === "report" ? (
            <ReportForm commentId={comment.id} onCancel={() => setPanel("none")} onDone={() => setPanel("reported")} />
          ) : null}
          {panel === "reported" ? (
            <p role="status" className="reader-meta mt-2 text-sm">
              Thanks. Our moderators will review this comment.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-sm text-[var(--status-danger)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function MenuItem({ children, onClick, danger }: { children: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center px-4 text-left text-sm transition hover:bg-[var(--panel-hover)] ${
        danger ? "text-[var(--status-danger)]" : "text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function ReportForm({ commentId, onCancel, onDone }: { commentId: string; onCancel: () => void; onDone: () => void }) {
  const name = useId();
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments/${encodeURIComponent(commentId)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note.trim() ? { reason, note } : { reason }),
      });
      if (!response.ok) throw new Error(await readError(response, "Couldn't send the report. Please try again."));
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't send the report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-3 rounded-2xl border border-[var(--paper-rule)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--paper-ink)]">Why are you reporting this comment?</legend>
        <div className="mt-2 grid gap-1">
          {REPORT_REASONS.map((option) => (
            <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--paper-ink)]">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="h-5 w-5 accent-[var(--accent-solid)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block">
        <span className="reader-meta text-xs">Anything else moderators should know? (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={REPORT_NOTE_MAX_LENGTH}
          rows={2}
          className="ui-input mt-1 block w-full resize-none px-3 py-2 text-base"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="story-button-secondary min-h-11">
          Cancel
        </button>
        <button type="submit" disabled={!reason || pending} className="story-button-primary min-h-11 disabled:opacity-50">
          {pending ? "Sending…" : "Send report"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
