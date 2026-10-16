"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { DEVICE_FOLLOWS_KEY, parseDeviceFollowIds } from "@/lib/author-follow-rules";

/*
 * One-time move of writers followed on this device (the old localStorage list)
 * onto the signed-in account. Runs once a session is confirmed; the server
 * keeps only real writers other than the member. The device list is cleared
 * once the server has taken it (or refused it as malformed), so it never runs
 * again; on 401/429/5xx/network errors it is kept for a later page load.
 */
export default function DeviceFollowImport() {
  const { session, status } = useAuthSession();
  const started = useRef(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated" || !userId || started.current) return;
    let ids: string[] = [];
    try {
      const raw = window.localStorage.getItem(DEVICE_FOLLOWS_KEY);
      if (raw === null) return;
      ids = parseDeviceFollowIds(JSON.parse(raw));
    } catch {
      ids = [];
    }
    started.current = true;

    const clear = () => {
      try {
        window.localStorage.removeItem(DEVICE_FOLLOWS_KEY);
      } catch {
        // Storage blocked: nothing to clear.
      }
    };
    if (ids.length === 0) {
      clear();
      return;
    }

    void fetch("/api/me/author-follows/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorIds: ids }),
    })
      .then((response) => {
        if (response.ok || response.status === 400) clear();
      })
      .catch(() => undefined);
  }, [status, userId]);

  return null;
}
