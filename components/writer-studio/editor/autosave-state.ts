import type { ApiFailureKind } from "@/lib/writer-studio/api";

/*
 * Pure autosave state machine (no React, no network) used by
 * use-episode-autosave.ts. Every edit bumps `editVersion`; a save captures
 * the version it sends, and the server's confirmation advances
 * `savedVersion` to it. Unsaved work exists whenever editVersion > savedVersion.
 */

export type AutosaveFailure = {
  kind: ApiFailureKind;
  message: string;
  attempt: number;
  /** When the next automatic retry happens (null: waits for the writer or for the network). */
  retryAt: number | null;
};

export type AutosaveState = {
  editVersion: number;
  savedVersion: number;
  inFlightVersion: number | null;
  lastSavedAt: number | null;
  failure: AutosaveFailure | null;
  online: boolean;
};

export type AutosaveEvent =
  | { type: "edit" }
  | { type: "saveStarted"; version: number }
  | { type: "saveSucceeded"; version: number; at: number }
  | { type: "saveFailed"; version: number; kind: ApiFailureKind; message: string; at: number }
  | { type: "online" }
  | { type: "offline" }
  /** The working copy now matches the server (e.g. local changes were discarded). */
  | { type: "markClean" };

export type SaveStatus =
  | { kind: "saved"; at: number | null }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "retrying"; retryAt: number; message: string }
  | { kind: "offline" }
  | { kind: "blocked"; reason: ApiFailureKind; message: string };

export const DEBOUNCE_MS = 1200;
export const MAX_WAIT_MS = 10_000;
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

export function isRetryable(kind: ApiFailureKind) {
  return kind === "network" || kind === "server";
}

export function retryDelay(attempt: number) {
  return RETRY_DELAYS_MS[Math.min(Math.max(attempt, 1), RETRY_DELAYS_MS.length) - 1];
}

export function initialAutosaveState(lastSavedAt: number | null, online = true): AutosaveState {
  return { editVersion: 0, savedVersion: 0, inFlightVersion: null, lastSavedAt, failure: null, online };
}

export function autosaveReducer(state: AutosaveState, event: AutosaveEvent): AutosaveState {
  switch (event.type) {
    case "edit":
      return { ...state, editVersion: state.editVersion + 1 };
    case "saveStarted":
      return { ...state, inFlightVersion: event.version };
    case "saveSucceeded":
      return {
        ...state,
        inFlightVersion: null,
        savedVersion: Math.max(state.savedVersion, event.version),
        lastSavedAt: event.at,
        failure: null,
      };
    case "saveFailed": {
      const attempt = (state.failure?.attempt ?? 0) + 1;
      const retryAt = isRetryable(event.kind) && state.online ? event.at + retryDelay(attempt) : null;
      return {
        ...state,
        inFlightVersion: null,
        failure: { kind: event.kind, message: event.message, attempt, retryAt },
      };
    }
    case "online":
      return { ...state, online: true };
    case "offline":
      return { ...state, online: false };
    case "markClean":
      return { ...state, savedVersion: state.editVersion, failure: null };
  }
}

export function hasUnsavedChanges(state: AutosaveState) {
  return state.editVersion > state.savedVersion;
}

export function deriveSaveStatus(state: AutosaveState): SaveStatus {
  if (state.inFlightVersion !== null) return { kind: "saving" };
  if (state.failure && !isRetryable(state.failure.kind)) {
    return { kind: "blocked", reason: state.failure.kind, message: state.failure.message };
  }
  if (!hasUnsavedChanges(state)) return { kind: "saved", at: state.lastSavedAt };
  if (!state.online || (state.failure?.kind === "network" && state.failure.retryAt === null)) {
    return { kind: "offline" };
  }
  if (state.failure?.retryAt) {
    return { kind: "retrying", retryAt: state.failure.retryAt, message: state.failure.message };
  }
  return { kind: "dirty" };
}
