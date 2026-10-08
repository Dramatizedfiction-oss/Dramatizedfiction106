"use client";

import { useId, useRef, useState } from "react";
import { uploadImage } from "@/lib/uploads/client-upload";
import type { ImagePurpose } from "@/lib/uploads/image-purposes";

/*
 * The one image control used everywhere an image can be set:
 *   [current image / placeholder]  [Upload | Replace]  [Remove]
 * It uploads through /api/uploads/image and hands the stored URL to
 * `onChange`; the owning form saves it through its usual route. On phones the
 * file input opens the normal camera/photo picker.
 */

const SHAPES = {
  cover: "aspect-[2/3] w-28",
  banner: "aspect-[3/1] w-full",
  avatar: "aspect-square w-24 rounded-full",
} as const;

export default function ImageUploadField({
  label,
  purpose,
  targetId,
  value,
  onChange,
  shape = "cover",
  hint,
  disabled = false,
}: {
  label: string;
  purpose: ImagePurpose;
  targetId?: string;
  value: string;
  onChange: (url: string) => void;
  shape?: keyof typeof SHAPES;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploading = progress !== null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProgress(0);
    const result = await uploadImage({ file, purpose, targetId, onProgress: setProgress });
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChange(result.url);
  }

  return (
    <div>
      <p className="theme-heading mb-2 text-sm font-semibold">{label}</p>
      <div className={`flex gap-4 ${shape === "banner" ? "flex-col" : "items-center"}`}>
        <div
          className={`${SHAPES[shape]} relative shrink-0 overflow-hidden border border-[var(--studio-border)] bg-[var(--studio-surface)] ${
            shape === "avatar" ? "" : "rounded-lg"
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`Current ${label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-[var(--studio-muted)]">
              No image
            </span>
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
              {Math.round((progress ?? 0) * 100)}%
            </span>
          ) : null}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              aria-describedby={statusId}
              className="story-button-secondary px-4 py-2 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : value ? "Replace" : "Upload image"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
                disabled={disabled || uploading}
                className="story-button-secondary px-4 py-2 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p id={statusId} role={error ? "alert" : undefined} className="text-xs leading-5">
            {error ? (
              <span className="text-[var(--status-danger)]">{error}</span>
            ) : (
              <span className="text-[var(--studio-muted)]">{hint ?? "JPEG, PNG or WebP. Large photos are resized for you."}</span>
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
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
