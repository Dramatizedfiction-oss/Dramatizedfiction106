"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNDO_MS = 6000;

/*
 * A list whose items can be removed with a short Undo (the Library shelves).
 * Removing marks the item at once and sends `remove`; the row shows an Undo
 * for UNDO_MS, then leaves the list. Undo sends `restore`. Requests for the
 * same item run one after another, so a quick Undo never races its removal.
 * A failed request puts the item back as it was and sets `error`.
 */
export function useUndoableRemove<T>({
  initial,
  keyOf,
  remove,
  restore,
  failMessage,
}: {
  initial: T[];
  keyOf: (item: T) => string;
  remove: (item: T) => Promise<void>;
  restore: (item: T) => Promise<void>;
  failMessage: string;
}) {
  const [items, setItems] = useState(initial);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<string, number>());
  const queues = useRef(new Map<string, Promise<void>>());
  // Mirrors `removed` for the timers, which run outside render.
  const removedNow = useRef(new Set<string>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const mark = useCallback((key: string, on: boolean) => {
    if (on) removedNow.current.add(key);
    else removedNow.current.delete(key);
    setRemoved(new Set(removedNow.current));
  }, []);

  const run = useCallback(
    (key: string, request: () => Promise<void>, onFail: () => void) => {
      const previous = queues.current.get(key) ?? Promise.resolve();
      const next = previous.then(request).catch(() => {
        onFail();
        setError(failMessage);
      });
      queues.current.set(key, next);
    },
    [failMessage],
  );

  function clearTimer(key: string) {
    const timer = timers.current.get(key);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(key);
  }

  function removeItem(item: T) {
    const key = keyOf(item);
    setError(null);
    mark(key, true);
    clearTimer(key);
    timers.current.set(
      key,
      window.setTimeout(() => {
        timers.current.delete(key);
        // Wait for the request to settle, then drop the row if it's still removed.
        void (queues.current.get(key) ?? Promise.resolve()).then(() => {
          if (!removedNow.current.has(key)) return;
          setItems((list) => list.filter((entry) => keyOf(entry) !== key));
          mark(key, false);
        });
      }, UNDO_MS),
    );
    run(key, () => remove(item), () => {
      clearTimer(key);
      mark(key, false);
    });
  }

  function undo(item: T) {
    const key = keyOf(item);
    setError(null);
    clearTimer(key);
    mark(key, false);
    run(key, () => restore(item), () => mark(key, true));
  }

  const liveCount = items.filter((item) => !removed.has(keyOf(item))).length;
  return { items, setItems, removed, removeItem, undo, error, liveCount };
}

/** fetch() that throws unless the response is OK. */
export async function send(url: string, method: "PUT" | "DELETE") {
  const response = await fetch(url, { method });
  if (!response.ok) throw new Error(String(response.status));
}
