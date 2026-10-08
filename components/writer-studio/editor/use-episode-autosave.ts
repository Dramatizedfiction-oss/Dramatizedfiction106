"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveEpisode, type EpisodeSaveInput } from "@/lib/writer-studio/api";
import {
  DEBOUNCE_MS,
  MAX_WAIT_MS,
  autosaveReducer,
  deriveSaveStatus,
  hasUnsavedChanges,
  initialAutosaveState,
  isRetryable,
  type AutosaveEvent,
  type AutosaveState,
} from "./autosave-state";

/*
 * Saves the episode being edited through the existing
 * PATCH /api/writer-studio/episodes/[id] (which never changes publication
 * status). Draft episodes save automatically: 1.2s after typing pauses, at
 * least every 10s while typing, and right away when the tab is hidden.
 * Live (published) episodes save only when flush() is called, because those
 * changes are visible to readers immediately.
 *
 * One request at a time; edits made during a save are sent by a follow-up.
 * Network/server failures retry with backoff; other failures stop and say why.
 */

const KEEPALIVE_LIMIT_BYTES = 60_000;

export type AutosaveMode = "draft" | "live";

export function useEpisodeAutosave({
  episodeId,
  mode,
  initialLastSavedAt,
  getPayload,
  onSaved,
}: {
  episodeId: string;
  mode: AutosaveMode;
  initialLastSavedAt: number | null;
  getPayload: () => EpisodeSaveInput;
  onSaved?: (result: { lastSavedAt: string; clean: boolean }) => void;
}) {
  const stateRef = useRef<AutosaveState>(initialAutosaveState(initialLastSavedAt));
  const [state, setState] = useState(stateRef.current);
  const send = useCallback((event: AutosaveEvent) => {
    stateRef.current = autosaveReducer(stateRef.current, event);
    setState(stateRef.current);
  }, []);

  const getPayloadRef = useRef(getPayload);
  const onSavedRef = useRef(onSaved);
  const modeRef = useRef(mode);
  getPayloadRef.current = getPayload;
  onSavedRef.current = onSaved;
  modeRef.current = mode;

  const debounceTimer = useRef<number | null>(null);
  const maxWaitTimer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const clearTimers = useCallback(() => {
    for (const timer of [debounceTimer, maxWaitTimer, retryTimer]) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Declared before use through a ref so timers always call the latest version.
  const runSaveRef = useRef<(options?: { force?: boolean; keepalive?: boolean }) => Promise<boolean>>();

  const scheduleRetry = useCallback(() => {
    const failure = stateRef.current.failure;
    if (!failure || failure.retryAt === null) return; // waits for "online" or the writer
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    retryTimer.current = window.setTimeout(
      () => void runSaveRef.current?.(),
      Math.max(0, failure.retryAt - Date.now()),
    );
  }, []);

  const scheduleAutosave = useCallback(
    (delay = DEBOUNCE_MS) => {
      if (modeRef.current !== "draft") return;
      // While offline or waiting on a retry, the retry/online handlers save.
      if (!stateRef.current.online || retryTimer.current !== null) return;
      if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => void runSaveRef.current?.(), delay);
      if (maxWaitTimer.current === null) {
        maxWaitTimer.current = window.setTimeout(() => void runSaveRef.current?.(), MAX_WAIT_MS);
      }
    },
    [],
  );

  const runSave = useCallback(
    async (options: { force?: boolean; keepalive?: boolean } = {}): Promise<boolean> => {
      // Strictly one request at a time: callers queue behind the one in flight.
      while (inFlight.current) await inFlight.current;

      const current = stateRef.current;
      if (!hasUnsavedChanges(current)) return true;
      // Rejected/expired/missing: don't keep sending until the writer retries.
      if (!options.force && current.failure && !isRetryable(current.failure.kind)) return false;

      clearTimers();
      const version = current.editVersion;
      const payload = getPayloadRef.current();
      const keepalive =
        Boolean(options.keepalive) && JSON.stringify(payload).length < KEEPALIVE_LIMIT_BYTES;

      send({ type: "saveStarted", version });
      const request = saveEpisode(episodeId, payload, { keepalive }).then((result) => {
        if (result.ok) {
          send({ type: "saveSucceeded", version, at: Date.now() });
          onSavedRef.current?.({
            lastSavedAt: result.data.episode.lastSavedAt,
            clean: !hasUnsavedChanges(stateRef.current),
          });
          return true;
        }
        send({ type: "saveFailed", version, kind: result.kind, message: result.message, at: Date.now() });
        return false;
      });

      inFlight.current = request;
      const ok = await request;
      inFlight.current = null;

      if (!ok) {
        scheduleRetry();
      } else if (hasUnsavedChanges(stateRef.current)) {
        // Edits arrived while saving.
        scheduleAutosave();
      }
      return ok;
    },
    [clearTimers, episodeId, scheduleAutosave, scheduleRetry, send],
  );
  runSaveRef.current = runSave;

  /** Call on every change to the working copy. */
  const markDirty = useCallback(() => {
    send({ type: "edit" });
    scheduleAutosave();
  }, [scheduleAutosave, send]);

  /** Saves everything now. Resolves true once the server has every change. */
  const flush = useCallback(
    async (options: { force?: boolean } = {}) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const ok = await runSave(options);
        if (!ok) return false;
        if (!hasUnsavedChanges(stateRef.current)) return true;
      }
      return !hasUnsavedChanges(stateRef.current);
    },
    [runSave],
  );

  const retryNow = useCallback(() => flush({ force: true }), [flush]);

  /** The working copy was reset to the server version (local changes discarded). */
  const markClean = useCallback(() => {
    clearTimers();
    send({ type: "markClean" });
  }, [clearTimers, send]);

  // Network status.
  useEffect(() => {
    const goOnline = () => {
      send({ type: "online" });
      const current = stateRef.current;
      if (hasUnsavedChanges(current) && (modeRef.current === "draft" || current.failure)) {
        void runSaveRef.current?.();
      }
    };
    const goOffline = () => send({ type: "offline" });
    if (!navigator.onLine) goOffline();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [send]);

  // Save drafts when the tab is hidden or closed; warn before leaving with unsaved work.
  useEffect(() => {
    const saveNow = () => {
      if (modeRef.current === "draft") void runSaveRef.current?.({ keepalive: true });
    };
    const saveOnHide = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges(stateRef.current) || inFlight.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", saveOnHide);
    window.addEventListener("pagehide", saveNow);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", saveOnHide);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, []);

  // Leaving the editor by in-app navigation (links, browser back) unmounts it
  // without beforeunload: send pending draft changes on the way out.
  useEffect(
    () => () => {
      clearTimers();
      if (modeRef.current === "draft" && hasUnsavedChanges(stateRef.current)) {
        void runSaveRef.current?.({ keepalive: true });
      }
    },
    [clearTimers],
  );

  return {
    status: deriveSaveStatus(state),
    hasUnsavedChanges: hasUnsavedChanges(state),
    isUnsaved: () => hasUnsavedChanges(stateRef.current),
    markDirty,
    flush,
    retryNow,
    markClean,
  };
}
