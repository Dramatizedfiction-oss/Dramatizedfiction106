"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Notice, Panel } from "@/components/admin/ui";
import ImageUploadField from "@/components/uploads/ImageUploadField";

type LibraryAvatar = { id: string; label: string; url: string; addedBy: string | null };

/*
 * Shared avatars and the Reader/Writer defaults. Defaults only apply to
 * members without their own picture; nothing here changes a member's picture.
 * Uploads use the normal image pipeline (purpose "platform-avatar", BOARD+).
 */
export default function AvatarLibrary({
  avatars,
  readerDefaultId,
  writerDefaultId,
  builtIn,
}: {
  avatars: LibraryAvatar[];
  readerDefaultId: string | null;
  writerDefaultId: string | null;
  builtIn: { reader: string; writer: string };
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const [reader, setReader] = useState(readerDefaultId ?? "");
  const [writer, setWriter] = useState(writerDefaultId ?? "");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const urlFor = (id: string, fallback: string) => avatars.find((avatar) => avatar.id === id)?.url ?? fallback;
  const defaultsChanged = reader !== (readerDefaultId ?? "") || writer !== (writerDefaultId ?? "");

  async function request(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setMessage({ tone: "error", text: payload?.error || "That didn't work. Please try again." });
      return false;
    }
    setMessage({ tone: "success", text: success });
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Default avatars"
        description="Shown for members who haven't uploaded their own picture. A member's own picture always wins, and changing a default never replaces it."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <DefaultPicker
            title="Readers"
            value={reader}
            onChange={setReader}
            avatars={avatars}
            preview={reader ? urlFor(reader, builtIn.reader) : builtIn.reader}
          />
          <DefaultPicker
            title="Writers, Board and CEO"
            value={writer}
            onChange={setWriter}
            avatars={avatars}
            preview={writer ? urlFor(writer, builtIn.writer) : builtIn.writer}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!defaultsChanged || busy}
            onClick={() => {
              if (!window.confirm("Apply these defaults to every member without their own picture?")) return;
              void request(
                "/api/admin/avatars",
                { method: "PUT", body: JSON.stringify({ readerId: reader || null, writerId: writer || null, confirm: true }) },
                "Defaults saved. They may take up to a minute to appear everywhere.",
              );
            }}
            className="story-button-primary disabled:opacity-50"
          >
            Save defaults
          </button>
          {defaultsChanged ? <span className="theme-meta text-xs">Preview shown above. Not saved yet.</span> : null}
        </div>
      </Panel>

      <Panel title="Add an avatar" description="Square images work best. JPEG, PNG or WebP, under 4 MB.">
        <label className="mb-4 block max-w-sm">
          <span className="theme-meta mb-1 block text-xs">Name (for Administration)</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
            placeholder="e.g. Violet silhouette"
            className="ui-input w-full px-3 py-2 text-sm"
          />
        </label>
        <ImageUploadField
          key={uploadKey}
          label="Image"
          purpose="platform-avatar"
          shape="avatar"
          value=""
          onChange={async (url) => {
            if (!url) return;
            const ok = await request(
              "/api/admin/avatars",
              { method: "POST", body: JSON.stringify({ url, label: label || "Avatar" }) },
              "Added to the library.",
            );
            if (ok) {
              setLabel("");
              setUploadKey((key) => key + 1);
            }
          }}
        />
      </Panel>

      <Panel title={`Library (${avatars.length})`}>
        {avatars.length === 0 ? (
          <p className="theme-meta text-sm">No shared avatars yet. The built-in defaults are in use.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {avatars.map((avatar) => {
              const inUse = avatar.id === readerDefaultId || avatar.id === writerDefaultId;
              return (
                <li key={avatar.id} className="rounded-2xl border border-[var(--border-color)] p-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar.url}
                    alt=""
                    className="mx-auto h-20 w-20 rounded-full border border-[var(--border-strong)] object-cover"
                  />
                  <p className="theme-heading mt-2 truncate text-sm font-medium">{avatar.label}</p>
                  {inUse ? (
                    <div className="mt-1">
                      <Badge tone="accent">{avatar.id === readerDefaultId ? "Reader default" : "Writer default"}</Badge>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || removing === avatar.id}
                    onClick={async () => {
                      const warning = inUse ? " It's a current default; that default will switch back to the built-in avatar." : "";
                      if (!window.confirm(`Remove "${avatar.label}" from the library?${warning}`)) return;
                      setRemoving(avatar.id);
                      await request(`/api/admin/avatars/${avatar.id}`, { method: "DELETE" }, "Removed from the library.");
                      setRemoving(null);
                    }}
                    className="mt-2 min-h-9 text-xs text-[var(--status-danger)] underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {removing === avatar.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}

function DefaultPicker({
  title,
  value,
  onChange,
  avatars,
  preview,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  avatars: LibraryAvatar[];
  preview: string;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-full border border-[var(--border-strong)] object-cover" />
      <label className="block min-w-0 flex-1">
        <span className="theme-heading mb-1 block text-sm font-semibold">{title}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="ui-input w-full px-3 py-2 text-sm">
          <option value="">Built-in default</option>
          {avatars.map((avatar) => (
            <option key={avatar.id} value={avatar.id}>
              {avatar.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
