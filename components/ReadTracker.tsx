"use client";

import { useEffect } from "react";

// A read is recorded only after the reader has had the episode open and
// visible for a few seconds. Failures are ignored: tracking must never affect
// reading.
const DWELL_MS = 5000;

export default function ReadTracker({ episodeId }: { episodeId: string }) {
  useEffect(() => {
    let sent = false;

    const timer = window.setTimeout(() => {
      if (sent || document.visibilityState !== "visible") {
        return;
      }

      sent = true;
      fetch("/api/reads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ episodeId }),
      }).catch(() => undefined);
    }, DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [episodeId]);

  return null;
}
