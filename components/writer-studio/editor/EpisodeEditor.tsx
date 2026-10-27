"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import EpisodeContent from "@/components/episode-content/EpisodeContent";
import PublishStep, { type PublishResult } from "@/components/writer-studio/publish/PublishStep";
import type { EpisodeDocument } from "@/lib/episode-content/types";
import { countWords, documentToPlainText, estimateReadTime, excerptText } from "@/lib/episode-content/text";
import { sceneBreakFor, sceneBreakNote } from "@/lib/scene-breaks";
import { seriesAccentStyle } from "@/lib/series-accent";
import { publishEpisode, type EpisodeSaveInput } from "@/lib/writer-studio/api";
import { UNTITLED_EPISODE, formatRelative } from "@/lib/writer-studio/format";
import type { EditableEpisode } from "@/lib/writer-studio/queries";
import EditorToolbar from "./EditorToolbar";
import EditorTopBar from "./EditorTopBar";
import { SceneBreakView } from "./scene-break-view";
import type { EditorStep } from "./StepIndicator";
import {
  clearBackup,
  readBackup,
  readLegacyBackup,
  resolveBackup,
  writeBackup,
  type EpisodeDraftFields,
} from "./local-backup";
import { useEpisodeAutosave } from "./use-episode-autosave";
import { useIsMobile } from "./use-viewport";

/*
 * The Writer Studio editor. Owns the one client-side working copy (this
 * episode) and composes: Tiptap (configured to the content contract),
 * autosave, the per-device backup, and the guarded ways out of the page.
 * Everything authoritative (status, number, ownership) stays on the server.
 *
 * Two steps on one page (Sweep F), in the URL as ?step=publish so the phone's
 * Back button moves between them: Write (title + text only) and Publish
 * (details, AI label, publish; "Details" for a live episode). Both steps
 * share the working copy and autosave, and the editor stays mounted, so
 * nothing (not even undo history) is lost moving back and forth.
 */

type Fields = Omit<EpisodeDraftFields, "bodyHtml">;
type Notice =
  | { kind: "restored"; writtenAt: number }
  | { kind: "offer"; draft: EpisodeDraftFields; writtenAt: number | null; reason: "server-newer" | "legacy" }
  | { kind: "other-tab" };

// Exactly the content contract (lib/episode-content/types): paragraphs, H2,
// blockquote, scene break (<hr>), bold, italic, line breaks, undo/redo.
// Anything else pasted in is reduced to text. Scene breaks are shown in the
// series' design (display only; still saved as <hr>).
const BASE_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2] },
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    link: false,
  }),
  Placeholder.configure({ placeholder: "Begin your episode…" }),
];

const LIVE_CONFIRM_KEY = "df:studio:live-update-confirmed";
const BACKUP_DELAY_MS = 300;

function htmlText(html: string) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, "");
  } catch {
    return html;
  }
}

export default function EpisodeEditor({
  episode,
  initialContent,
}: {
  episode: EditableEpisode;
  initialContent: EpisodeDocument;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const step: EditorStep = searchParams.get("step") === "publish" ? "publish" : "write";
  const isMobile = useIsMobile();
  const live = episode.status === "PUBLISHED";
  const mode = live ? "live" : "draft";

  // The genre doesn't change while editing (it's set in series details).
  const [sceneBreak] = useState(() => {
    const choice = sceneBreakFor(episode.series.genre, episode.series.tags);
    return { design: choice.design, note: sceneBreakNote(choice, episode.series.genre) };
  });
  const [extensions] = useState(() => [...BASE_EXTENSIONS, SceneBreakView.configure(sceneBreak)]);

  const initialFields: Fields = {
    title: episode.title === UNTITLED_EPISODE ? "" : episode.title,
    description: episode.description,
    contentWarning: episode.contentWarning,
    coverImage: episode.coverImage,
    aiUsageTag: episode.aiUsageTag,
  };

  const [fields, setFields] = useState<Fields>(initialFields);
  const fieldsRef = useRef(fields);
  const editorRef = useRef<Editor | null>(null);
  const serverSnapshot = useRef<EpisodeDraftFields | null>(null);
  const baseLastSavedAt = useRef(episode.lastSavedAt);
  const backupTimer = useRef<number | null>(null);
  const wordTimer = useRef<number | null>(null);

  const [wordCount, setWordCount] = useState(() => countWords(documentToPlainText(initialContent)));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [readerView, setReaderView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ---- payload & backup ----------------------------------------------------

  const getPayload = useCallback((): EpisodeSaveInput => {
    const editor = editorRef.current;
    const current = fieldsRef.current;
    const words = editor ? countWords(editor.getText()) : undefined;
    return {
      // A blank title keeps the stored one (the API ignores blank titles).
      title: current.title.trim() || undefined,
      // Never send a body before the editor holds the real content.
      body: editor ? editor.getHTML() : undefined,
      description: current.description,
      contentWarning: current.contentWarning,
      coverImage: current.coverImage,
      aiUsageTag: current.aiUsageTag,
      readTime: words === undefined ? undefined : estimateReadTime(words),
    };
  }, []);

  const cancelBackup = useCallback(() => {
    if (backupTimer.current !== null) window.clearTimeout(backupTimer.current);
    backupTimer.current = null;
  }, []);

  const writeBackupNow = useCallback(() => {
    cancelBackup();
    const editor = editorRef.current;
    if (!editor) return;
    writeBackup({
      v: 1,
      episodeId: episode.id,
      writtenAt: Date.now(),
      baseLastSavedAt: baseLastSavedAt.current,
      ...fieldsRef.current,
      bodyHtml: editor.getHTML(),
    });
  }, [cancelBackup, episode.id]);

  const scheduleBackup = useCallback(() => {
    cancelBackup();
    backupTimer.current = window.setTimeout(writeBackupNow, BACKUP_DELAY_MS);
  }, [cancelBackup, writeBackupNow]);

  const autosave = useEpisodeAutosave({
    episodeId: episode.id,
    mode,
    initialLastSavedAt: Date.parse(episode.lastSavedAt) || null,
    getPayload,
    onSaved: ({ lastSavedAt, clean }) => {
      baseLastSavedAt.current = lastSavedAt;
      if (clean) {
        cancelBackup();
        clearBackup(episode.id);
      } else {
        scheduleBackup();
      }
    },
  });
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  const markChange = useCallback(() => {
    autosaveRef.current.markDirty();
    scheduleBackup();
  }, [scheduleBackup]);

  const updateWordCount = useCallback((editor: Editor, immediate = false) => {
    if (wordTimer.current !== null) window.clearTimeout(wordTimer.current);
    const run = () => setWordCount(countWords(editor.getText()));
    if (immediate) run();
    else wordTimer.current = window.setTimeout(run, 400);
  }, []);

  const applyFields = useCallback((next: Fields) => {
    fieldsRef.current = next;
    setFields(next);
  }, []);

  /** Puts a whole draft into the editor as a new edit (it will be saved). */
  const applyDraft = useCallback(
    (draft: EpisodeDraftFields) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.commands.setContent(draft.bodyHtml, { emitUpdate: false });
      const { bodyHtml: _body, ...rest } = draft;
      applyFields(rest);
      updateWordCount(editor, true);
      markChange();
    },
    [applyFields, markChange, updateWordCount],
  );

  // ---- editor --------------------------------------------------------------

  const handleCreate = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      const server: EpisodeDraftFields = { ...fieldsRef.current, bodyHtml: editor.getHTML() };
      serverSnapshot.current = server;

      let legacy = readLegacyBackup(episode.id);
      if (legacy && htmlText(legacy) === htmlText(server.bodyHtml)) legacy = null;
      const backup = readBackup(episode.id);
      const resolution = resolveBackup({ ...server, lastSavedAt: episode.lastSavedAt }, backup, legacy);

      if (resolution.action === "restore") {
        applyDraft(resolution.backup);
        setNotice({ kind: "restored", writtenAt: resolution.writtenAt });
      } else if (resolution.action === "offer") {
        setNotice({ kind: "offer", draft: resolution.backup, writtenAt: resolution.writtenAt, reason: resolution.reason });
      } else if (backup || readLegacyBackup(episode.id)) {
        clearBackup(episode.id);
      }
    },
    [applyDraft, episode.id, episode.lastSavedAt],
  );

  const handlersRef = useRef({ handleCreate, markChange, updateWordCount });
  handlersRef.current = { handleCreate, markChange, updateWordCount };

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: episode.bodyHtml,
    editorProps: {
      attributes: {
        class: "reading-body theme-body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Episode text",
      },
      // Clear of the top bar + step row (100px) and the phone toolbar + Next row.
      scrollMargin: { top: 140, bottom: 190, left: 0, right: 0 },
      scrollThreshold: { top: 140, bottom: 190, left: 0, right: 0 },
    },
    onCreate: ({ editor: created }) => handlersRef.current.handleCreate(created),
    onUpdate: ({ editor: updated }) => {
      handlersRef.current.markChange();
      handlersRef.current.updateWordCount(updated);
    },
  });

  const blocked = autosave.status.kind === "blocked" && autosave.status.reason !== "rejected" && autosave.status.reason !== "unauthenticated";

  useEffect(() => {
    // emitUpdate=false: toggling editability is not an edit and must not trigger a save.
    if (editor && editor.isEditable !== (!readerView && !blocked)) {
      editor.setEditable(!readerView && !blocked, false);
    }
  }, [blocked, editor, readerView]);

  // Keep the backup current when leaving; clear timers.
  useEffect(
    () => () => {
      if (autosaveRef.current.isUnsaved()) writeBackupNow();
      if (wordTimer.current !== null) window.clearTimeout(wordTimer.current);
      cancelBackup();
    },
    [cancelBackup, writeBackupNow],
  );

  // Warn when the same episode is open in another tab.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("df-studio-editor");
    const tabId = Math.random().toString(36).slice(2);
    channel.onmessage = (event: MessageEvent<{ type: string; episodeId: string; tabId: string }>) => {
      const message = event.data;
      if (message?.episodeId !== episode.id || message.tabId === tabId) return;
      if (message.type === "hello") channel.postMessage({ type: "here", episodeId: episode.id, tabId });
      setNotice((current) => current ?? { kind: "other-tab" });
    };
    channel.postMessage({ type: "hello", episodeId: episode.id, tabId });
    return () => channel.close();
  }, [episode.id]);

  // ---- actions -------------------------------------------------------------

  const updateLive = useCallback(async () => {
    if (!autosaveRef.current.isUnsaved()) return;
    let confirmed = false;
    try {
      confirmed = window.sessionStorage.getItem(LIVE_CONFIRM_KEY) === "1";
    } catch {
      // ignore
    }
    if (!confirmed) {
      if (!window.confirm("Readers will see these changes right away. Update the live episode?")) return;
      try {
        window.sessionStorage.setItem(LIVE_CONFIRM_KEY, "1");
      } catch {
        // ignore
      }
    }
    setBusy(true);
    await autosaveRef.current.flush({ force: true });
    setBusy(false);
  }, []);

  // Ctrl/Cmd+S saves now (drafts) or updates the live episode.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (live) void updateLive();
        else void autosaveRef.current.flush({ force: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [live, updateLive]);

  /** Leaves the editor only once changes are safe, or the writer chooses to. */
  const leaveTo = useCallback(
    async (href: string) => {
      setActionError(null);
      const current = autosaveRef.current;
      if (!live) {
        const ok = await current.flush();
        if (
          !ok &&
          current.isUnsaved() &&
          !window.confirm(
            "Your latest changes haven't reached the server yet. They're kept on this device and will be offered when you come back. Leave anyway?",
          )
        ) {
          return;
        }
      } else if (
        current.isUnsaved() &&
        !window.confirm("You have changes that aren't live yet. They're kept on this device. Leave without updating?")
      ) {
        return;
      }
      if (current.isUnsaved()) writeBackupNow();
      router.push(href);
    },
    [live, router, writeBackupNow],
  );

  /** Moves between Write and Publish in place (the URL keeps the step for Back/forward). */
  const goToStep = useCallback(
    (next: EditorStep) => {
      setActionError(null);
      if (next === step) return;
      setReaderView(false);
      window.history.pushState(null, "", next === "publish" ? `${pathname}?step=publish` : pathname);
      window.scrollTo({ top: 0 });
      // Drafts save on the way to Publish (live edits wait for Update live).
      if (next === "publish" && !live) void autosaveRef.current.flush();
    },
    [live, pathname, step],
  );

  // Same publish action as before: save everything, then the publish route
  // with the same fields (title, description, content warning, AI label).
  const publish = useCallback(async (): Promise<PublishResult> => {
    setActionError(null);
    const ok = await autosaveRef.current.flush({ force: true });
    if (!ok) {
      return {
        ok: false,
        message: "Your changes need to be saved before you can publish. Check the save status above and try again.",
      };
    }
    const current = fieldsRef.current;
    const result = await publishEpisode(episode.id, {
      title: current.title.trim(),
      description: current.description,
      contentWarning: current.contentWarning,
      aiUsageTag: current.aiUsageTag,
    });
    if (!result.ok) return { ok: false, message: result.message };
    router.refresh();
    return { ok: true };
  }, [episode.id, router]);

  const onDetailsChange = useCallback(
    (next: Partial<Fields>) => {
      applyFields({ ...fieldsRef.current, ...next });
      markChange();
    },
    [applyFields, markChange],
  );

  const readTime = estimateReadTime(wordCount);
  const nextLabel = live ? "Next: Details" : "Next: Publish details";

  // ---- render --------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col">
      <EditorTopBar
        seriesTitle={episode.series.title}
        episodeNumber={episode.episodeNumber}
        status={episode.status}
        saveStatus={autosave.status}
        mode={mode}
        step={step}
        hasUnsavedChanges={autosave.hasUnsavedChanges}
        readerView={readerView}
        busy={busy}
        onBack={() => void leaveTo(`/writer-studio/series/${episode.series.id}`)}
        onRetry={() => void autosave.retryNow()}
        onStepChange={goToStep}
        onToggleReaderView={() => setReaderView((value) => !value)}
        onPreview={() => void leaveTo(`/writer-studio/episodes/${episode.id}/preview`)}
        onUpdateLive={() => void updateLive()}
        onViewLive={() => void leaveTo(`/episode/${episode.id}`)}
      />

      <Notices
        notice={notice}
        live={live}
        onDismiss={() => setNotice(null)}
        onUndoRestore={() => {
          if (serverSnapshot.current) applyDraft(serverSnapshot.current);
          setNotice(null);
        }}
        onUseLocal={(draft) => {
          applyDraft(draft);
          setNotice(null);
        }}
        onKeepServer={() => {
          clearBackup(episode.id);
          setNotice(null);
        }}
      />

      {actionError ? (
        <p role="alert" className="mx-auto mt-4 w-full max-w-[760px] px-4 text-sm text-[var(--status-danger)]">
          {actionError}
        </p>
      ) : null}
      {live && step === "write" ? (
        <p className="mx-auto mt-4 w-full max-w-[760px] px-4 text-sm text-[var(--studio-muted)]">
          This episode is live. Your edits are kept on this device until you press <strong>Update live</strong>.
        </p>
      ) : null}

      {/* Step 2. The Write step below stays mounted (hidden) so the editor keeps its state. */}
      {step === "publish" ? (
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
          <PublishStep
            episode={{ id: episode.id, episodeNumber: episode.episodeNumber }}
            series={{
              id: episode.series.id,
              title: episode.series.title,
              live: episode.series.status === "PUBLISHED",
              genre: episode.series.genre,
              tags: episode.series.tags,
              coverImage: episode.series.coverImage,
            }}
            title={fields.title}
            wordCount={wordCount}
            readTime={readTime}
            opening={excerptText(editor?.getText() ?? documentToPlainText(initialContent), 70)}
            live={live}
            values={{
              description: fields.description,
              contentWarning: fields.contentWarning,
              coverImage: fields.coverImage,
              aiUsageTag: fields.aiUsageTag,
            }}
            readOnly={blocked}
            busy={busy}
            hasUnsavedChanges={autosave.hasUnsavedChanges}
            onChange={onDetailsChange}
            onEditWriting={() => goToStep("write")}
            onPublish={publish}
            onUpdateLive={() => void updateLive()}
          />
        </main>
      ) : null}

      <div className={step === "write" ? "flex flex-1" : "hidden"}>
        <main className="min-w-0 flex-1 px-4 pb-48 pt-6 md:px-8">
          <div className="mx-auto max-w-[760px]">
            {!readerView && !isMobile ? <EditorToolbar editor={editor} mobile={false} /> : null}

            <header className="mb-6 mt-8">
              <p className="eyebrow">
                Episode {episode.episodeNumber} | {readTime} min read
              </p>
              <input
                value={fields.title}
                readOnly={readerView || blocked}
                onChange={(event) => {
                  applyFields({ ...fieldsRef.current, title: event.target.value });
                  markChange();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    editor?.commands.focus("start");
                  }
                }}
                placeholder="Untitled episode"
                aria-label="Episode title"
                maxLength={200}
                className="font-heading theme-heading mt-3 w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-[var(--studio-muted)] sm:text-4xl md:text-5xl"
              />
              <p className="theme-meta mt-2 text-sm">{episode.series.title}</p>
            </header>

            <div
              className="reader-paper episode-editor series-accent px-5 py-7 sm:px-6 sm:py-8 md:px-12 md:py-12"
              style={seriesAccentStyle(episode.series.themeColor)}
            >
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="reading-body theme-body" aria-busy="true">
                  <EpisodeContent content={initialContent} sceneBreak={sceneBreak.design} />
                </div>
              )}
            </div>

            <p className="theme-meta mt-4 text-center text-xs">
              {wordCount.toLocaleString()} words · about {readTime} min to read
            </p>

            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => goToStep("publish")}
                className="story-button-primary w-full sm:w-auto sm:px-8"
              >
                {nextLabel} →
              </button>
              <p className="theme-meta text-center text-xs">
                {live ? "Description, image and AI label." : "Description, image, AI label, then publish."} Nothing you
                write is lost going back and forth.
              </p>
            </div>
          </div>
        </main>
      </div>

      {isMobile && !readerView && step === "write" ? (
        <EditorToolbar
          editor={editor}
          mobile
          footer={
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="theme-meta text-xs">{wordCount.toLocaleString()} words</span>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToStep("publish")}
                className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-[var(--accent)]"
              >
                {nextLabel} →
              </button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}

function Notices({
  notice,
  live,
  onDismiss,
  onUndoRestore,
  onUseLocal,
  onKeepServer,
}: {
  notice: Notice | null;
  live: boolean;
  onDismiss: () => void;
  onUndoRestore: () => void;
  onUseLocal: (draft: EpisodeDraftFields) => void;
  onKeepServer: () => void;
}) {
  if (!notice) return null;

  let text: string;
  let actions: React.ReactNode;

  if (notice.kind === "restored") {
    text = `Restored unsaved changes from this device (${formatRelative(notice.writtenAt)}).${
      live ? " Press Update live to publish them." : ""
    }`;
    actions = (
      <>
        <NoticeButton onClick={onUndoRestore}>Undo</NoticeButton>
        <NoticeButton onClick={onDismiss}>OK</NoticeButton>
      </>
    );
  } else if (notice.kind === "offer") {
    text =
      notice.reason === "legacy"
        ? "This device has an unsaved copy of this episode from the previous editor."
        : `This device has unsaved changes${notice.writtenAt ? ` from ${formatRelative(notice.writtenAt)}` : ""}, but a newer version was saved since. You're seeing the newer saved version.`;
    actions = (
      <>
        <NoticeButton onClick={() => onUseLocal(notice.draft)}>Use this device&apos;s copy</NoticeButton>
        <NoticeButton onClick={onKeepServer}>Keep saved version</NoticeButton>
      </>
    );
  } else {
    text = "This episode is also open in another tab. Edit in one tab at a time so changes don't overwrite each other.";
    actions = <NoticeButton onClick={onDismiss}>OK</NoticeButton>;
  }

  return (
    <div role="status" className="border-b border-[var(--studio-border)] bg-[var(--studio-surface)]">
      <div className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--studio-text)]">{text}</p>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </div>
    </div>
  );
}

function NoticeButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="story-button-secondary px-3 py-1.5 text-xs">
      {children}
    </button>
  );
}
