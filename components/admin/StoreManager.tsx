"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemList from "@/components/author-profile/editor/ItemList";
import { Badge, Notice, Panel } from "@/components/admin/ui";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import { STORE_ITEM_NAME_MAX } from "@/lib/store/rules";

/*
 * Administration › Back of the store › Avatars (Sweep D; was Administration ›
 * Store, before that Avatars). Board and CEO.
 *   - Default avatars for Readers and for Writers/Board/CEO (shown to members
 *     without their own picture; never replaces one).
 *   - Add an avatar: upload (resized to 512px WebP on the server), name it.
 *   - Items: rename, hide/show, reorder (drag, arrow keys or ▲/▼, then Save
 *     order), remove. Hidden items leave the Store; members already using one
 *     keep it. Removing one resets members using it to the default.
 * Everything is free: there are no prices here.
 */
export type ManagedItem = { id: string; avatarId: string | null; name: string; imageUrl: string; active: boolean };
type Row = ManagedItem & { key: string };

export default function StoreManager({
  items,
  readerDefaultId,
  writerDefaultId,
  builtIn,
}: {
  items: ManagedItem[];
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
  const [rows, setRows] = useState<Row[]>(() => items.map((item) => ({ ...item, key: item.id })));
  const [openKey, setOpenKey] = useState<string | null>(null);

  // A refresh after a change brings the server's list; adopt it.
  useEffect(() => setRows(items.map((item) => ({ ...item, key: item.id }))), [items]);

  const avatars = items.filter((item) => item.avatarId);
  const urlFor = (avatarId: string, fallback: string) => avatars.find((item) => item.avatarId === avatarId)?.imageUrl ?? fallback;
  const defaultsChanged = reader !== (readerDefaultId ?? "") || writer !== (writerDefaultId ?? "");
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

  async function remove(row: Row) {
    const isDefault = row.avatarId && (row.avatarId === readerDefaultId || row.avatarId === writerDefaultId);
    const warning = isDefault ? " It's a current default; that default goes back to the built-in avatar." : "";
    if (!window.confirm(`Remove "${row.name}" from the Store? Members using it go back to the default picture.${warning}`)) return;
    await request(`/api/admin/store/items/${encodeURIComponent(row.id)}`, { method: "DELETE" }, `Removed "${row.name}".`);
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Default avatars"
        description="Shown for members who haven't chosen a picture. A member's own choice always wins, and changing a default never replaces it."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <DefaultPicker title="Readers" value={reader} onChange={setReader} avatars={avatars} preview={reader ? urlFor(reader, builtIn.reader) : builtIn.reader} />
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
            className="story-button-primary min-h-11 disabled:opacity-50"
          >
            Save defaults
          </button>
          {defaultsChanged ? <span className="theme-meta text-xs">Preview shown above. Not saved yet.</span> : null}
        </div>
      </Panel>

      <Panel title="Add an avatar" description="Square images work best. JPEG, PNG or WebP, under 4 MB. It's resized to 512px and added at the end of the Store.">
        <label className="mb-4 block max-w-sm">
          <span className="theme-heading mb-1 block text-sm font-semibold">Name</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={STORE_ITEM_NAME_MAX}
            placeholder="e.g. Violet silhouette"
            className="ui-input w-full px-3 py-2 text-base sm:text-sm"
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
            const ok = await request("/api/admin/avatars", { method: "POST", body: JSON.stringify({ url, label: label || "Avatar" }) }, "Added to the Store.");
            if (ok) {
              setLabel("");
              setUploadKey((key) => key + 1);
            }
          }}
        />
      </Panel>

      <Panel
        title={`Avatars (${items.length})`}
        description="The order here is the order members see. Tap an item to rename, hide or remove it."
        action={
          orderChanged ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void request(
                  "/api/admin/store/order",
                  { method: "PUT", body: JSON.stringify({ category: "AVATAR", ids: rows.map((row) => row.id) }) },
                  "Order saved.",
                )
              }
              className="story-button-primary min-h-11 disabled:opacity-50"
            >
              Save order
            </button>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <p className="theme-meta text-sm">No avatars yet. Add one above; until then members see the built-in defaults.</p>
        ) : (
          <ItemList
            items={rows}
            itemName="item"
            openKey={openKey}
            onOpenKeyChange={setOpenKey}
            onChange={(next) => {
              // The list's ✕ removes a row: confirm and delete on the server instead.
              if (next.length < rows.length) {
                const gone = rows.find((row) => !next.some((other) => other.id === row.id));
                if (gone) void remove(gone);
                return;
              }
              setRows(next);
            }}
            summary={(row) => ({
              title: row.name,
              detail: row.active ? "Shown in the Store" : "Hidden: not offered in the Store",
              badge: (
                <span className="flex shrink-0 items-center gap-2">
                  {row.avatarId === readerDefaultId ? <Badge tone="accent">Reader default</Badge> : null}
                  {row.avatarId === writerDefaultId ? <Badge tone="accent">Writer default</Badge> : null}
                  {!row.active ? <Badge>Hidden</Badge> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.imageUrl} alt="" className={`h-9 w-9 rounded-full border border-[var(--border-strong)] object-cover ${row.active ? "" : "opacity-50"}`} />
                </span>
              ),
            })}
            renderForm={(row) => <ItemForm row={row} busy={busy} request={request} onRemove={() => void remove(row)} />}
          />
        )}
        {orderChanged ? <p className="theme-meta mt-3 text-xs">New order not saved yet.</p> : null}
      </Panel>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}

function ItemForm({
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border border-[var(--border-strong)] object-cover" />
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
              row.active ? `"${row.name}" is hidden. Members already using it keep it.` : `"${row.name}" is back in the Store.`,
            )
          }
          className="story-button-secondary min-h-11 disabled:opacity-50"
        >
          {row.active ? "Hide from the Store" : "Show in the Store"}
        </button>
        <button type="button" disabled={busy} onClick={onRemove} className="min-h-11 rounded-full px-4 text-sm font-semibold text-[var(--status-danger)] hover:bg-[var(--panel-hover)] disabled:opacity-50">
          Remove
        </button>
      </div>
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
  avatars: ManagedItem[];
  preview: string;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-full border border-[var(--border-strong)] object-cover" />
      <label className="block min-w-0 flex-1">
        <span className="theme-heading mb-1 block text-sm font-semibold">{title}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="ui-input w-full px-3 py-2 text-base sm:text-sm">
          <option value="">Built-in default</option>
          {avatars.map((item) => (
            <option key={item.id} value={item.avatarId!}>
              {item.name}
              {item.active ? "" : " (hidden)"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
