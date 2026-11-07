"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the phone's Back button (Android's system back, the browser's back)
 * close an open layer (menu drawer, bottom sheet, Studio sheet) instead of
 * leaving the page. Sweep 4.
 *
 * Opening adds one history entry for the same URL, carrying Next's own state
 * (spread from history.state, so the App Router treats it as its own entry);
 * Back pops it and closes the layer. Closing any other way removes that entry
 * again, so the history is as it was.
 */
export function useCloseOnBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const marker = Math.random().toString(36).slice(2);
    let poppedByBack = false;
    window.history.pushState({ ...(window.history.state ?? {}), dfLayer: marker }, "");

    const onPopState = () => {
      // Still on a layer entry (e.g. one left behind by a re-run effect): not ours to close.
      if (window.history.state?.dfLayer) return;
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      // Closed by a tap, Escape or the close button: drop the entry we added.
      // (Closed by navigating away: the entry is no longer current; leave it.)
      if (!poppedByBack && window.history.state?.dfLayer === marker) window.history.back();
    };
  }, [open]);
}
