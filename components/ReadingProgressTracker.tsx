"use client";

import { useEffect } from "react";

/*
 * Reports how far down the story the reader has scrolled (0-100), for the
 * series page's progress bars and "Continue episode N". At most every 30
 * seconds while reading, plus once when the page is hidden or left; only when
 * the furthest point has moved. Signed-in members only (the page decides).
 * Failures are ignored: tracking must never affect reading.
 */
const INTERVAL_MS = 30_000;

export default function ReadingProgressTracker({ episodeId, targetId }: { episodeId: string; targetId: string }) {
  useEffect(() => {
    let furthest = 0;
    let sent = 0;
    let last = 0;

    function measure() {
      const target = document.getElementById(targetId);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      // How much of the story's height has scrolled past the bottom of the screen.
      const seen = rect.height <= 0 ? 0 : ((window.innerHeight - rect.top) / rect.height) * 100;
      const percent = Math.min(100, Math.max(0, Math.round(seen)));
      if (percent > furthest) furthest = percent;
    }

    function send() {
      if (furthest <= sent) return;
      sent = furthest;
      last = Date.now();
      fetch(`/api/me/progress/${encodeURIComponent(episodeId)}`, {
        method: "PUT",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: furthest }),
      }).catch(() => undefined);
    }

    function onScroll() {
      measure();
      if (Date.now() - last >= INTERVAL_MS) send();
    }

    function onHide(event: Event) {
      if (event.type === "pagehide" || document.visibilityState === "hidden") {
        measure();
        send();
      }
    }

    measure();
    // Don't count a page opened and closed straight away.
    last = Date.now();
    const timer = window.setInterval(() => {
      measure();
      send();
    }, INTERVAL_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      measure();
      send();
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [episodeId, targetId]);

  return null;
}
