"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A public link with Copy / Share / Open. `path` must be a public route
 * (callers build it from published records only). The absolute URL is built
 * in the browser from the current origin, so it matches whichever deployment
 * the writer is using without trusting request headers.
 */
export default function ShareLinkRow({
  label,
  description,
  path,
  shareTitle,
}: {
  label: string;
  description?: string;
  path: string;
  shareTitle?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(path);
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
    setCanShare(typeof navigator.share === "function");
  }, [path]);

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      // Clipboard blocked (permissions / insecure context): select it for a manual copy.
      inputRef.current?.select();
      setStatus("manual");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: shareTitle || label, url });
    } catch {
      // Dismissed by the user, or unsupported; nothing to do.
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-raised)] p-4">
      <p className="theme-heading text-sm font-semibold">{label}</p>
      {description ? <p className="theme-meta mt-1 text-sm leading-6">{description}</p> : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label={`${label} link`}
          onFocus={(event) => event.currentTarget.select()}
          className="ui-input min-w-0 flex-1 truncate rounded-full px-4 py-2.5 font-mono-df text-xs"
        />
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="story-button-primary flex-1 px-4 py-2.5 sm:flex-none">
            {status === "copied" ? "Copied" : "Copy link"}
          </button>
          {canShare ? (
            <button type="button" onClick={share} className="story-button-secondary flex-1 px-4 py-2.5 sm:flex-none">
              Share
            </button>
          ) : null}
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="story-button-secondary flex-1 px-4 py-2.5 sm:flex-none"
          >
            Open
          </a>
        </div>
      </div>

      <p aria-live="polite" className={status === "idle" ? "sr-only" : "theme-meta mt-2 text-xs"}>
        {status === "copied" ? "Link copied to your clipboard." : status === "manual" ? "Press Ctrl+C (or ⌘C) to copy the selected link." : ""}
      </p>
    </div>
  );
}
