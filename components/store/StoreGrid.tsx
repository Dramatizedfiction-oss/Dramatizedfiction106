"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import Sheet from "@/components/writer-studio/ui/Sheet";

/*
 * The Store's item grid (Sweep B3). Tap an item to see it larger, then "Use
 * this avatar": it's applied right away through PATCH /api/me/profile-images
 * (which only accepts active Store avatars) and the "Using" marker moves to
 * it. Everything is free; no prices are shown. Signed-out visitors can browse
 * and are sent to sign in (and back) to choose.
 */
export type StoreGridItem = { id: string; name: string; imageUrl: string };

export default function StoreGrid({
  items,
  currentImage,
  hasPhoto,
  signedIn,
  emptyText,
}: {
  items: StoreGridItem[];
  currentImage: string | null;
  hasPhoto: boolean;
  signedIn: boolean;
  emptyText: string;
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [current, setCurrent] = useState(currentImage);
  const [selected, setSelected] = useState<StoreGridItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function use(item: StoreGridItem) {
    if (busy) return;
    if (hasPhoto && current !== item.imageUrl && !window.confirm("Your own photo will be removed. Use this avatar instead?")) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/me/profile-images", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: item.imageUrl }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (response?.status === 401) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/store")}`);
      return;
    }
    if (!response?.ok) {
      setError(payload?.error || "Couldn't change your avatar. Please try again.");
      return;
    }
    setCurrent(item.imageUrl);
    setSelected(null);
    setNotice(`${item.name} is now your avatar.`);
    void refreshSession();
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
        <p className="theme-meta mx-auto max-w-md text-sm leading-6">{emptyText}</p>
      </div>
    );
  }

  const selectedIsCurrent = selected ? selected.imageUrl === current : false;

  return (
    <>
      <p aria-live="polite" className="theme-meta min-h-6 text-sm">
        {notice}
      </p>
      <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => {
          const using = item.imageUrl === current;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSelected(item);
                }}
                aria-label={`${item.name}${using ? ", currently using" : ""}`}
                className={`relative flex w-full flex-col items-center gap-2 rounded-2xl border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  using ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className={`aspect-square w-full max-w-[96px] rounded-full border-2 bg-[var(--surface-raised)] object-cover ${using ? "border-[var(--accent)]" : "border-transparent"}`}
                />
                <span className="w-full truncate text-center text-xs font-medium text-[var(--text-primary)]">{item.name}</span>
                {using ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full border border-[var(--accent)] bg-[var(--bg-secondary)] px-2 py-0.5 font-mono-df text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    Using
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={Boolean(selected)}
        title={selected?.name ?? "Avatar"}
        onRequestClose={() => (busy ? undefined : setSelected(null))}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {error ? (
                <p role="alert" className="mr-auto text-sm text-[var(--status-danger)]">
                  {error}
                </p>
              ) : null}
              <button type="button" onClick={() => setSelected(null)} disabled={busy} className="story-button-secondary min-h-11">
                Close
              </button>
              {selectedIsCurrent ? (
                <span className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--accent)]">Currently using</span>
              ) : signedIn ? (
                <button type="button" onClick={() => void use(selected)} disabled={busy} className="story-button-primary min-h-11 disabled:opacity-60">
                  {busy ? "Applying…" : "Use this avatar"}
                </button>
              ) : (
                <Link href={`/sign-in?callbackUrl=${encodeURIComponent("/store")}`} className="story-button-primary min-h-11">
                  Sign in to use
                </Link>
              )}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt={selected.name} className="h-40 w-40 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] object-cover" />
            <p className="theme-meta max-w-xs text-sm leading-6">
              {selectedIsCurrent ? "This is your avatar right now." : "Free to use. It replaces your current avatar right away, and you can change it any time."}
            </p>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
