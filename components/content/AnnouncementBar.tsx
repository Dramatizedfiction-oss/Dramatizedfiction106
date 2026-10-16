"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isExternalHref, safeHref } from "@/lib/content/markdown";

/*
 * The announcement banner from Administration › Content (site.announcement,
 * Sweep B3): one line across the top of every page, with an optional link.
 * A visitor can dismiss it; that's remembered on the device for this exact
 * message, so a new message shows again. `preview` (the editor) never hides.
 */
export type Announcement = { text: string; linkLabel: string; linkHref: string };

const STORAGE_KEY = "df-announcement-dismissed";

function fingerprint(announcement: Announcement) {
  const source = `${announcement.text}|${announcement.linkLabel}|${announcement.linkHref}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) | 0;
  return String(hash);
}

export default function AnnouncementBar({ announcement, preview = false }: { announcement: Announcement; preview?: boolean }) {
  // Hidden until the device's dismissal has been checked, so it doesn't flash.
  const [visible, setVisible] = useState(preview);
  const id = fingerprint(announcement);

  useEffect(() => {
    if (preview) return;
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== id);
    } catch {
      setVisible(true);
    }
  }, [id, preview]);

  if (!visible || !announcement.text) return null;
  const href = announcement.linkHref ? safeHref(announcement.linkHref) : null;

  return (
    <div role="region" aria-label="Announcement" className="border-b border-[var(--border-color)] bg-[var(--accent-soft)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-11 max-w-6xl items-center gap-2 py-1 pl-4 pr-1 text-sm">
        <p className="min-w-0 flex-1 py-1.5 leading-5">
          {announcement.text}
          {href && announcement.linkLabel ? (
            <>
              {" "}
              {isExternalHref(href) ? (
                <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="whitespace-nowrap font-semibold underline underline-offset-4">
                  {announcement.linkLabel}
                </a>
              ) : (
                <Link href={href} className="whitespace-nowrap font-semibold underline underline-offset-4">
                  {announcement.linkLabel}
                </Link>
              )}
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => {
            if (preview) return;
            setVisible(false);
            try {
              window.localStorage.setItem(STORAGE_KEY, id);
            } catch {
              // Storage blocked: it stays hidden until the next page load.
            }
          }}
          aria-label="Dismiss announcement"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
