"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

/**
 * App-styled replacement for the native season <select>. Follows the WAI-ARIA
 * "select-only combobox" pattern: a button that opens a listbox, with arrow,
 * Home/End, Enter/Space, Escape and type-ahead support.
 *
 * Presentation only. Seasons are not in the data model yet, so choosing one
 * changes nothing on the page (same as the <select> it replaces).
 */
export default function SeasonSelector({
  seasons = ["Season 1"],
  label = "Choose season",
}: {
  seasons?: string[];
  label?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openList(index = selected) {
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    setSelected(index);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = seasons.length - 1;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList(event.key === "ArrowUp" ? Math.max(selected - 1, 0) : selected);
      }
      return;
    }

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
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1) {
          const match = seasons.findIndex((season) =>
            season.toLowerCase().startsWith(event.key.toLowerCase()),
          );
          if (match >= 0) setActive(match);
        }
    }
  }

  const listId = `${id}-list`;

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] sm:min-w-[160px]"
      >
        <span className="truncate">{seasons[selected]}</span>
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

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        // z-30: stays under the sticky mobile header (z-40) when scrolled.
        className="theme-panel absolute left-0 top-full z-30 mt-2 max-h-64 w-full min-w-[160px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[20px] border border-[var(--border-color)] p-1.5 shadow-2xl"
      >
        {seasons.map((season, index) => {
          const isSelected = index === selected;
          return (
            <li
              key={season}
              id={`${id}-opt-${index}`}
              data-index={index}
              role="option"
              aria-selected={isSelected}
              onPointerEnter={() => setActive(index)}
              // Keep focus on the button so the combobox stays the focus owner.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[14px] px-4 text-sm text-[var(--text-primary)] ${
                index === active ? "bg-[var(--accent-soft)]" : ""
              } ${isSelected ? "font-semibold" : ""}`}
            >
              <span className="truncate">{season}</span>
              {isSelected ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-[hsl(var(--series-accent))]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
