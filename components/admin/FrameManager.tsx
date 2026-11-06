"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemList from "@/components/author-profile/editor/ItemList";
import { Badge, Notice, Panel } from "@/components/admin/ui";
import { StoreFrameArt } from "@/components/avatar/FramedAvatar";
import UserAvatar from "@/components/UserAvatar";
import { FRAME_PHOTO_SHARE, FRAME_SAFE_SHARE } from "@/lib/avatar-crop";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import { FRAME_UPLOAD_MAX_BYTES, STORE_ITEM_NAME_MAX } from "@/lib/store/rules";

/*
 * Administration › Back of the store › Frames (Sweep I). Board and CEO; the
 * routes check the role again. Upload a square frame with a transparent
 * middle (PNG, WebP or SVG; the server cleans SVG and stores a 512px WebP),
 * preview it on a sample avatar at the real sizes with the circle and safe
 * zone drawn in, then rename, hide, reorder or remove. Hidden frames stop
 * showing on members (they fall back to their level frame or none) until
 * shown again; removing one clears it for everyone. Everything is free.
 */
export type ManagedFrame = { id: string; name: string; imageUrl: string; active: boolean; wearers: number };
type Row = ManagedFrame & { key: string };

const SIZES = [160, 48, 32];

export default function FrameManager({ items }: { items: ManagedFrame[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => items.map((item) => ({ ...item, key: item.id })));
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => setRows(items.map((item) => ({ ...item, key: item.id }))), [items]);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const orderChanged = rows.map((row) => row.id).join() !== items.map((item) => item.id).join();

  async function request(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
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

  async function upload() {
    if (!file || busy) return;
    if (file.size > FRAME_UPLOAD_MAX_BYTES) {
      setMessage({ tone: "error", text: "That frame is too large. Please keep it under 1 MB." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file, "frame");
    form.append("name", name || "Frame");
    const response = await fetch("/api/admin/store/frames", { method: "POST", credentials: "include", body: form }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setMessage({ tone: "error", text: payload?.error || "Couldn't add that frame. Please try again." });
      return;
    }
    setMessage({ tone: "success", text: "Added to the Store." });
    setName("");
    setFile(null);
    setFileKey((key) => key + 1);
    router.refresh();
  }

  async function remove(row: Row) {
    const wearing = row.wearers ? ` ${row.wearers} member${row.wearers === 1 ? " is" : "s are"} wearing it and will go back to their level frame or none.` : "";
    if (!window.confirm(`Remove "${row.name}" from the Store?${wearing}`)) return;
    await request(`/api/admin/store/items/${encodeURIComponent(row.id)}`, { method: "DELETE" }, `Removed "${row.name}".`);
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Add a frame"
        description="A square image with a transparent middle: PNG, WebP or SVG, under 1 MB (PNG and WebP at least 256px). The avatar fills the solid circle; keep the frame's art outside the dashed safe zone so faces stay visible."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <label className="block max-w-sm">
              <span className="theme-heading mb-1 block text-sm font-semibold">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={STORE_ITEM_NAME_MAX}
                placeholder="e.g. Ivy wreath"
                className="ui-input w-full px-3 py-2 text-base sm:text-sm"
              />
            </label>
            <label className="block max-w-sm">
              <span className="theme-heading mb-1 block text-sm font-semibold">Image</span>
              <input
                key={fileKey}
                type="file"
                accept="image/png,image/webp,image/svg+xml,.svg"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block min-h-11 w-full text-sm text-[var(--text-secondary)] file:mr-3 file:min-h-11 file:rounded-full file:border file:border-[var(--border-strong)] file:bg-transparent file:px-4 file:text-sm file:font-semibold file:text-[var(--text-primary)]"
              />
            </label>
            <button type="button" disabled={!file || busy} onClick={() => void upload()} className="story-button-primary min-h-11 disabled:opacity-50">
              {busy ? "Adding…" : "Add to the Store"}
            </button>
          </div>
          <FramePreview imageUrl={preview} guide />
        </div>
      </Panel>

      <Panel
        title={`Frames (${items.length})`}
        description="The order here is the order members see. Tap a frame to preview it, rename, hide or remove it. Hidden frames stop showing on members until shown again."
        action={
          orderChanged ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void request("/api/admin/store/order", { method: "PUT", body: JSON.stringify({ category: "FRAME", ids: rows.map((row) => row.id) }) }, "Order saved.")
              }
              className="story-button-primary min-h-11 disabled:opacity-50"
            >
              Save order
            </button>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <p className="theme-meta text-sm">No frames yet. Add one above.</p>
        ) : (
          <ItemList
            items={rows}
            itemName="frame"
            openKey={openKey}
            onOpenKeyChange={setOpenKey}
            onChange={(next) => {
              if (next.length < rows.length) {
                const gone = rows.find((row) => !next.some((other) => other.id === row.id));
                if (gone) void remove(gone);
                return;
              }
              setRows(next);
            }}
            summary={(row) => ({
              title: row.name,
              detail: `${row.active ? "Shown in the Store" : "Hidden: not offered or shown"} · ${row.wearers} wearing`,
              badge: (
                <span className="flex shrink-0 items-center gap-2">
                  {!row.active ? <Badge>Hidden</Badge> : null}
                  <span className={row.active ? "" : "opacity-50"}>
                    <FramedSample imageUrl={row.imageUrl} size={36} />
                  </span>
                </span>
              ),
            })}
            renderForm={(row) => <FrameForm row={row} busy={busy} request={request} onRemove={() => void remove(row)} />}
          />
        )}
        {orderChanged ? <p className="theme-meta mt-3 text-xs">New order not saved yet.</p> : null}
      </Panel>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}

function FrameForm({
  row,
  busy,
  request,
  onRemove,
}: {
  row: Row;
  busy: boolean;
  request: (url: string, init: RequestInit, success: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [name, setName] = useState(row.name);
  const url = `/api/admin/store/items/${encodeURIComponent(row.id)}`;
  return (
    <div className="space-y-4">
      <FramePreview imageUrl={row.imageUrl} guide />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="theme-heading mb-1 block text-sm font-semibold">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={STORE_ITEM_NAME_MAX} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
        </label>
        <button
          type="button"
          disabled={busy || !name.trim() || name.trim() === row.name}
          onClick={() => void request(url, { method: "PATCH", body: JSON.stringify({ name }) }, "Name saved.")}
          className="story-button-secondary min-h-11 disabled:opacity-50"
        >
          Save name
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void request(
              url,
              { method: "PATCH", body: JSON.stringify({ active: !row.active }) },
              row.active ? `"${row.name}" is hidden. Members wearing it see their level frame or none until it's shown again.` : `"${row.name}" is back in the Store.`,
            )
          }
          className="story-button-secondary min-h-11 disabled:opacity-50"
        >
          {row.active ? "Hide" : "Show in the Store"}
        </button>
        <button type="button" disabled={busy} onClick={onRemove} className="min-h-11 rounded-full px-4 text-sm font-semibold text-[var(--status-danger)] hover:bg-[var(--panel-hover)] disabled:opacity-50">
          Remove
        </button>
      </div>
    </div>
  );
}

/** A sample avatar wearing the frame, with the same proportions FramedAvatar uses. */
function FramedSample({ imageUrl, size, guide = false }: { imageUrl: string | null; size: number; guide?: boolean }) {
  const photo = Math.round(size * FRAME_PHOTO_SHARE);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className="block overflow-hidden rounded-full" style={{ width: photo, height: photo }}>
        <UserAvatar user={{ image: BUILT_IN_AVATARS.writer, role: "WRITER" }} size="sm" eager className="!h-full !w-full !border-0" />
      </span>
      {imageUrl ? <StoreFrameArt imageUrl={imageUrl} eager /> : null}
      {guide ? (
        <>
          <span aria-hidden className="pointer-events-none absolute rounded-full border border-[#22c55e]" style={{ width: photo, height: photo }} />
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-dashed border-[#f43f5e]"
            style={{ width: photo * FRAME_SAFE_SHARE, height: photo * FRAME_SAFE_SHARE }}
          />
        </>
      ) : null}
    </span>
  );
}

function FramePreview({ imageUrl, guide }: { imageUrl: string | null; guide?: boolean }) {
  const [showGuide, setShowGuide] = useState(Boolean(guide));
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-inset)] p-4">
      <div className="flex flex-wrap items-end gap-5" role="group" aria-label="Frame preview at real sizes">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-1.5">
            <FramedSample imageUrl={imageUrl} size={size} guide={showGuide && size >= 48} />
            <span className="theme-meta text-[10px] uppercase tracking-[0.16em]">{size}px</span>
          </div>
        ))}
      </div>
      {!imageUrl ? <p className="theme-meta mt-3 text-xs">Choose an image to preview it here.</p> : null}
      {guide ? (
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={showGuide} onChange={(event) => setShowGuide(event.target.checked)} className="h-5 w-5" />
          Show the avatar circle (solid) and safe zone (dashed)
        </label>
      ) : null}
    </div>
  );
}
