"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

/*
 * An editable, reorderable list for the profile editor (Library cards, About
 * cards, Links). Each row: a drag handle (pointer drag, or arrow keys when
 * focused), the item's summary (tap to open its form), up/down buttons for
 * phones, and Remove. One row is open at a time.
 */
export default function ItemList<T extends { key: string }>({
  items,
  onChange,
  summary,
  renderForm,
  itemName,
  openKey,
  onOpenKeyChange,
  wrapTitles = false,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  /** Title and optional subtitle shown on the row. */
  summary: (item: T, index: number) => { title: string; detail?: string; badge?: ReactNode };
  renderForm: (item: T, update: (next: T) => void) => ReactNode;
  /** "card" / "link", for button labels. */
  itemName: string;
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
  /** Let long titles wrap instead of cutting them off (narrow phones). */
  wrapTitles?: boolean;
}) {
  const rows = useRef(new Map<string, HTMLLIElement>());
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setAnnouncement(`${summary(item, to).title || `This ${itemName}`} moved to position ${to + 1} of ${items.length}.`);
  }

  function onHandleDown(event: PointerEvent<HTMLButtonElement>, key: string) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragKey(key);
  }

  function onHandleMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragKey) return;
    const from = items.findIndex((item) => item.key === dragKey);
    if (from < 0) return;
    // The new index is the number of other rows whose middle is above the pointer.
    let to = 0;
    for (const item of items) {
      if (item.key === dragKey) continue;
      const rect = rows.current.get(item.key)?.getBoundingClientRect();
      if (rect && rect.top + rect.height / 2 < event.clientY) to += 1;
    }
    if (to !== from) move(from, to);
  }

  return (
    <>
      <ol className="space-y-2">
        {items.map((item, index) => {
          const open = openKey === item.key;
          const info = summary(item, index);
          const title = info.title || `Untitled ${itemName}`;
          return (
            <li
              key={item.key}
              ref={(node) => {
                if (node) rows.current.set(item.key, node);
                else rows.current.delete(item.key);
              }}
              className={`rounded-2xl border bg-[var(--bg-secondary)] transition ${
                dragKey === item.key ? "border-[hsl(var(--series-accent))] shadow-[var(--shadow-raised)]" : "border-[var(--border-color)]"
              }`}
            >
              <div className="flex items-center gap-1 p-1.5">
                <button
                  type="button"
                  aria-label={`Reorder ${title}. Drag, or use the up and down arrow keys.`}
                  onPointerDown={(event) => onHandleDown(event, item.key)}
                  onPointerMove={onHandleMove}
                  onPointerUp={() => setDragKey(null)}
                  onPointerCancel={() => setDragKey(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(index, index - 1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(index, index + 1);
                    }
                  }}
                  className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:cursor-grabbing"
                >
                  <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    {[5, 10, 15].flatMap((y) => [7, 13].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
                  </svg>
                </button>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onOpenKeyChange(open ? null : item.key)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className={`theme-heading block text-sm font-semibold ${wrapTitles ? "break-words py-1 leading-snug" : "truncate"}`}>{title}</span>
                    {info.detail ? <span className="theme-meta block truncate text-xs">{info.detail}</span> : null}
                  </span>
                  {info.badge}
                  <span aria-hidden className={`text-[var(--text-muted)] transition ${open ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </button>
                <IconButton label={`Move ${title} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <path d="M5 12l5-5 5 5" />
                </IconButton>
                <IconButton label={`Move ${title} down`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                  <path d="M5 8l5 5 5-5" />
                </IconButton>
                <IconButton
                  label={`Remove ${title}`}
                  danger
                  onClick={() => {
                    onChange(items.filter((other) => other.key !== item.key));
                    if (open) onOpenKeyChange(null);
                    setAnnouncement(`${title} removed.`);
                  }}
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </IconButton>
              </div>
              {open ? (
                <div className="border-t border-[var(--border-color)] p-4">
                  {renderForm(item, (next) => onChange(items.map((other) => (other.key === item.key ? next : other))))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function IconButton({
  label,
  disabled = false,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-30 ${
        danger ? "text-[var(--status-danger)]" : "text-[var(--text-secondary)]"
      }`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
