"use client";

import { useEffect, useState } from "react";

const storageKey = "df-followed-authors";

export default function FollowingFeedHint() {
  const [followCount, setFollowCount] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setFollowCount(Array.isArray(parsed) ? parsed.length : 0);
    } catch {
      setFollowCount(0);
    }
  }, []);

  return (
    <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
      <p className="eyebrow">Following Feed</p>
      <p className="theme-meta mt-3 text-sm leading-6">
        {followCount > 0
          ? `${followCount} followed author${followCount === 1 ? "" : "s"} will appear in recommendations placeholders and future following filters.`
          : "Follow authors to seed the future Following feed and recommendations placeholder."}
      </p>
    </div>
  );
}
