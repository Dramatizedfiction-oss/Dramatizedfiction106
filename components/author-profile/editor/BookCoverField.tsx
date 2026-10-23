"use client";

import { useEffect, useRef, useState } from "react";
import AvatarCropper from "@/components/avatar/AvatarCropper";
import type { AvatarCrop } from "@/lib/avatar-crop";
import { prepareFile } from "@/lib/uploads/client-upload";
import { MAX_ORIGINAL_BYTES, MAX_UPLOAD_BYTES } from "@/lib/uploads/image-purposes";

/*
 * A Library book's cover: choose an image, position it in the 2:3 frame (the
 * avatar cropper's portrait mode), and the server stores a 600x900 crop via
 * POST /api/me/author-profile/book-cover. The URL is saved with the card when
 * the profile is saved. Re-positioning means choosing the image again (no
 * original is kept, to keep storage small).
 */
export default function BookCoverField({ value, title, onChange }: { value: string; title: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ blob: Blob; src: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.src);
  }, [picked]);

  async function choose(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (file.type && !file.type.startsWith("image/")) return setError("Please choose a JPEG, PNG or WebP image.");
    if (file.size > MAX_ORIGINAL_BYTES) return setError("That image is too large. Please choose one under 25 MB.");
    const blob = await prepareFile(file);
    if (blob.size > MAX_UPLOAD_BYTES) return setError("That image is too large to upload. Please choose a smaller one.");
    setPicked({ blob, src: URL.createObjectURL(blob) });
  }

  async function save(crop: AvatarCrop) {
    if (!picked) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", picked.blob, "cover");
    form.append("x", String(crop.x));
    form.append("y", String(crop.y));
    form.append("zoom", String(crop.zoom));
    const response = await fetch("/api/me/author-profile/book-cover", { method: "POST", body: form, credentials: "include" }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { url?: string; error?: string } | null;
    setBusy(false);
    if (!response?.ok || !payload?.url) {
      setError(response?.status === 401 ? "Your session has expired. Sign in again, then retry." : payload?.error || "The cover couldn't be uploaded. Please try again.");
      return;
    }
    onChange(payload.url);
    setPicked(null);
  }

  if (picked) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] p-4">
        <p className="theme-heading mb-1 text-center text-sm font-semibold">Position the cover</p>
        <AvatarCropper frame="portrait" src={picked.src} initial={null} busy={busy} error={error} onSave={(crop) => void save(crop)} onCancel={() => setPicked(null)} />
      </div>
    );
  }

  return (
    <div>
      <p className="theme-heading mb-2 text-sm font-semibold">Cover</p>
      <div className="flex items-center gap-4">
        <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`Cover of ${title || "this book"}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] text-[var(--text-muted)]">No cover</span>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="story-button-secondary min-h-11 px-4">
              {value ? "Replace" : "Upload cover"}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange("")} className="story-button-secondary min-h-11 px-4">
                Remove
              </button>
            ) : null}
          </div>
          <p role={error ? "alert" : undefined} className="text-xs leading-5">
            {error ? (
              <span className="text-[var(--status-danger)]">{error}</span>
            ) : (
              <span className="theme-meta">JPEG, PNG or WebP. You can position it before it&apos;s saved.</span>
            )}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void choose(event.target.files?.[0])}
      />
    </div>
  );
}
