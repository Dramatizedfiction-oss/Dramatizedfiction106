"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import FilterOptionLabel from "@/components/explore/FilterOptionLabel";
import type { FilterStyle } from "@/lib/filter-styles.config";

export type StyledOption = { value: string; style: FilterStyle };

const SHEET_QUERY = "(max-width: 640px)";

/*
 * A single-choice drop-down whose options are drawn in their own styles.
 * Closed: a compact button showing the current choice. Open: a popover under it
 * on wider screens, a bottom sheet (48px rows, drag handle, close button) on
 * phones. Button + listbox pattern: focus moves into the list, arrows/Home/End/
 * type-ahead move, Enter/Space choose, Escape closes and returns focus.
 */
export default function StyledDropdown({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  /** What is being chosen ("Genre", "Sort"); the accessible name. */
  label: string;
  options: StyledOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [dragY, setDragY] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dragStart = useRef<number | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];
  const listId = `${id}-list`;

  useEffect(() => {
    const query = window.matchMedia(SHEET_QUERY);
    const update = () => setSheet(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setDragY(0);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Focus the list on open; keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // Popover: close on outside press. Sheet: lock page scroll behind it.
  useEffect(() => {
    if (!open) return;
    if (sheet) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open, sheet, close]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    close();
  }

  function handleButtonKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  }

  function handleListKey(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        if (sheet) {
          // Keep focus inside the sheet: list <-> close button.
          event.preventDefault();
          closeRef.current?.focus();
        } else {
          close(false);
        }
        break;
      default:
        if (event.key.length === 1) {
          const key = event.key.toLowerCase();
          const match = options.findIndex((option) => option.style.label.toLowerCase().startsWith(key));
          if (match >= 0) setActive(match);
        }
    }
  }

  function handleDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStart.current));
  }

  function handleDragEnd() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > 80) close();
    else setDragY(0);
  }

  const list = (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-activedescendant={`${id}-opt-${active}`}
      onKeyDown={handleListKey}
      onBlur={(event) => {
        // Popover: close when focus leaves it (e.g. another drop-down opens).
        if (!sheet && !rootRef.current?.contains(event.relatedTarget as Node | null)) close(false);
      }}
      className={
        sheet
          ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none"
          : "max-h-[min(26rem,70vh)] overflow-y-auto p-1.5 outline-none"
      }
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <li
            key={option.value}
            id={`${id}-opt-${index}`}
            data-index={index}
            role="option"
            aria-selected={isSelected}
            onPointerEnter={() => setActive(index)}
            // Keep focus in the list so its blur handler doesn't close it mid-click.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(index)}
            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 ${
              sheet ? "min-h-12" : "min-h-11"
            } ${index === active ? "bg-[var(--accent-soft)]" : ""}`}
          >
            <FilterOptionLabel style={option.style} selected={isSelected} />
            <CheckMark visible={isSelected} />
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected?.style.label ?? ""}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleButtonKey}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-raised)] px-2.5 text-[13px] transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <span className="min-w-0 overflow-hidden py-1">
          {selected ? <FilterOptionLabel key={selected.value} style={selected.style} selected /> : null}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {open && !sheet ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-max min-w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-raised)] shadow-[var(--shadow-raised)]">
          {list}
        </div>
      ) : null}

      {open && sheet
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex flex-col justify-end">
              <div
                aria-hidden="true"
                className="fx-sheet-backdrop absolute inset-0 bg-[var(--overlay-bg)]"
                onClick={() => close()}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className="fx-sheet relative flex max-h-[80vh] flex-col rounded-t-3xl border-t border-[var(--border-color)] bg-[var(--surface-raised)] shadow-[var(--shadow-raised)]"
                style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
              >
                <div
                  className="touch-none select-none px-4 pb-2 pt-2"
                  onPointerDown={handleDragStart}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                >
                  <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-[var(--border-strong)]" />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="eyebrow">{label}</p>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={() => close()}
                      onPointerDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Tab") {
                          event.preventDefault();
                          listRef.current?.focus();
                        } else if (event.key === "Escape") {
                          close();
                        }
                      }}
                      aria-label={`Close ${label.toLowerCase()} options`}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 5l10 10M15 5L5 15" />
                      </svg>
                    </button>
                  </div>
                </div>
                {list}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function CheckMark({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-[hsl(var(--series-accent))] ${visible ? "" : "invisible"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}
