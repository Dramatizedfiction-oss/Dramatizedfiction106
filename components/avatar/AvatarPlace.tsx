"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import AvatarCropper from "@/components/avatar/AvatarCropper";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import type { AvatarCrop } from "@/lib/avatar-crop";
import { defaultAvatarFor } from "@/lib/avatars";
import { prepareFile } from "@/lib/uploads/client-upload";
import { MAX_ORIGINAL_BYTES, MAX_UPLOAD_BYTES } from "@/lib/uploads/image-purposes";

/*
 * The avatar place (/reader/avatar): choose a library avatar, or upload and
 * position your own photo, or go back to the default. Every change saves at
 * once (PATCH /api/me/profile-images for library/default, /api/me/avatar/photo
 * for photos); the server checks everything again.
 */

type LibraryAvatar = { id: string; label: string; url: string };
type PhotoState = { image: string | null; originalUrl: string | null; crop: AvatarCrop | null };
type Editing = { kind: "new"; file: File; src: string } | { kind: "adjust"; src: string };

const TABS = [
  { id: "library", label: "Library" },
  { id: "photo", label: "My photo" },
] as const;

export default function AvatarPlace({
  member,
  initial,
  library,
}: {
  member: { name: string; role: string; writerStatus: string | null };
  initial: PhotoState;
  library: LibraryAvatar[];
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const id = useId();
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(initial.originalUrl ? "photo" : "library");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hasPhoto = Boolean(state.originalUrl);
  const defaultSrc = defaultAvatarFor(member.role);

  // Free the preview's object URL when it is no longer shown.
  useEffect(() => {
    if (editing?.kind !== "new") return;
    const src = editing.src;
    return () => URL.revokeObjectURL(src);
  }, [editing]);

  async function after(response: Response | null, saved: string) {
    const payload = (await response?.json().catch(() => null)) as (PhotoState & { error?: string }) | { image?: string | null; error?: string } | null;
    if (!response?.ok) {
      const message = payload?.error || "Couldn't save your avatar. Please try again.";
      setStatus({ tone: "error", text: message });
      return { ok: false as const, message };
    }
    setStatus({ tone: "saved", text: saved });
    void refreshSession();
    router.refresh();
    return { ok: true as const, payload };
  }

  async function chooseLibrary(url: string | null) {
    if (busy || url === state.image) return;
    if (hasPhoto && !window.confirm("Your photo will be removed. Use this avatar instead?")) return;
    setBusy(true);
    setStatus(null);
    const response = await fetch("/api/me/profile-images", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    }).catch(() => null);
    const result = await after(response, url ? "Saved. This is your avatar now." : "Saved. You're using the default avatar.");
    if (result.ok) setState({ image: url, originalUrl: null, crop: null });
    setBusy(false);
  }

  async function removePhoto() {
    if (busy) return;
    if (!window.confirm(hasPhoto ? "Remove your photo and use the default avatar?" : "Use the default avatar?")) return;
    setBusy(true);
    setStatus(null);
    const response = await fetch("/api/me/avatar/photo", { method: "DELETE", credentials: "include" }).catch(() => null);
    const result = await after(response, "Saved. You're using the default avatar.");
    if (result.ok) setState({ image: null, originalUrl: null, crop: null });
    setBusy(false);
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    setCropError(null);
    if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus({ tone: "error", text: "Please choose a JPEG, PNG or WebP photo." });
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      setStatus({ tone: "error", text: "That photo is too large. Please choose one under 25 MB." });
      return;
    }
    setEditing({ kind: "new", file, src: URL.createObjectURL(file) });
  }

  async function save(crop: AvatarCrop) {
    if (!editing || busy) return;
    setBusy(true);
    setCropError(null);
    let response: Response | null;
    if (editing.kind === "new") {
      const prepared = await prepareFile(editing.file);
      if (prepared.size > MAX_UPLOAD_BYTES) {
        setCropError("That photo is too large to upload. Please choose a smaller one.");
        setBusy(false);
        return;
      }
      const form = new FormData();
      form.append("file", prepared, "photo");
      form.append("x", String(crop.x));
      form.append("y", String(crop.y));
      form.append("zoom", String(crop.zoom));
      response = await fetch("/api/me/avatar/photo", { method: "POST", credentials: "include", body: form }).catch(() => null);
    } else {
      response = await fetch("/api/me/avatar/photo", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crop),
      }).catch(() => null);
    }
    const result = await after(response, "Saved. Your photo is your avatar now.");
    if (result.ok) {
      setState(result.payload as PhotoState);
      setEditing(null);
    } else {
      setCropError(result.message);
      setStatus(null);
    }
    setBusy(false);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const wrapped = (next + TABS.length) % TABS.length;
    setTab(TABS[wrapped].id);
    tabRefs.current[wrapped]?.focus();
  }

  if (editing) {
    return (
      <section aria-labelledby={`${id}-crop`} className="mx-auto max-w-xl">
        <h2 id={`${id}-crop`} className="font-heading theme-heading text-center text-2xl font-semibold">
          {editing.kind === "new" ? "Position your photo" : "Adjust your photo"}
        </h2>
        <div className="mt-4">
          <AvatarCropper
            src={editing.src}
            initial={editing.kind === "adjust" ? state.crop : null}
            busy={busy}
            error={cropError}
            onSave={(crop) => void save(crop)}
            onCancel={() => {
              setEditing(null);
              setCropError(null);
            }}
          />
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <FramedAvatar
          user={{ image: state.image, role: member.role, writerStatus: member.writerStatus }}
          size="2xl"
          label={`${member.name}'s avatar`}
          eager
        />
        <p className="theme-meta mt-3 text-sm">This is how other members see you.</p>
        <p className="mt-2 min-h-6 text-sm" aria-live="polite">
          {status ? (
            <span className={status.tone === "error" ? "text-[var(--status-danger)]" : "text-[var(--status-live)]"} role={status.tone === "error" ? "alert" : undefined}>
              {status.text}
            </span>
          ) : null}
        </p>
      </div>

      <div role="tablist" aria-label="Choose your avatar" className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] p-1">
        {TABS.map((item, index) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`${id}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => onTabKey(event, index)}
              className={`min-h-11 rounded-full px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] ${
                selected
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-strong)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="mt-6">
        {tab === "library" ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[{ id: "default", label: "Default", url: null as string | null }, ...library].map((avatar) => {
              const current = avatar.url === state.image || (avatar.url === null && !state.image);
              return (
                <li key={avatar.id}>
                  <button
                    type="button"
                    onClick={() => void chooseLibrary(avatar.url)}
                    disabled={busy}
                    aria-pressed={current}
                    className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 transition disabled:cursor-wait ${
                      current ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar.url ?? defaultSrc}
                      alt=""
                      loading="lazy"
                      className={`h-[72px] w-[72px] rounded-full border-2 bg-[var(--surface-raised)] object-cover ${current ? "border-[var(--accent)]" : "border-transparent"}`}
                    />
                    <span className="w-full truncate text-center text-xs text-[var(--text-primary)]">{avatar.label}</span>
                    {current ? <span className="font-mono-df text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Current</span> : null}
                  </button>
                </li>
              );
            })}
            {library.length === 0 ? (
              <li className="theme-meta col-span-full text-center text-sm">The library is empty for now. You can upload your own photo instead.</li>
            ) : null}
          </ul>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col items-stretch gap-3 text-center">
            <p className="theme-meta text-sm leading-6">
              {hasPhoto
                ? "Your photo is your avatar. Move or zoom it, or replace it with a new one."
                : "Upload a photo, then move and zoom it inside the circle. JPEG, PNG or WebP."}
            </p>
            {hasPhoto && state.originalUrl ? (
              <button
                type="button"
                onClick={() => setEditing({ kind: "adjust", src: state.originalUrl! })}
                disabled={busy}
                className="story-button-primary min-h-11 justify-center"
              >
                Adjust position
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className={`${hasPhoto ? "story-button-secondary" : "story-button-primary"} min-h-11 justify-center`}
            >
              {hasPhoto ? "Replace photo" : "Upload a photo"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                pickFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 border-t border-[var(--border-color)] pt-6">
        <button
          type="button"
          onClick={() => void removePhoto()}
          disabled={busy || !state.image}
          className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-[var(--text-secondary)] underline underline-offset-4 transition hover:text-[var(--text-primary)] disabled:no-underline disabled:opacity-50"
        >
          {hasPhoto ? "Remove photo, use default" : "Use the default avatar"}
        </button>
        <Link href="/reader" className="story-button-secondary min-h-11">
          Done
        </Link>
      </div>
    </div>
  );
}
