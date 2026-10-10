"use client";

import { useRef, type KeyboardEvent } from "react";

/*
 * App-styled single choice (radio group) shown as a segmented pill. Arrow
 * keys move and select, Home/End jump; only the selected segment is in the
 * tab order. Segments are at least 44px tall.
 */
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((option) => option.value === value));

  function move(next: number) {
    const target = (next + options.length) % options.length;
    onChange(options[target].value);
    refs.current[target]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const actions: Record<string, () => void> = {
      ArrowRight: () => move(index + 1),
      ArrowDown: () => move(index + 1),
      ArrowLeft: () => move(index - 1),
      ArrowUp: () => move(index - 1),
      Home: () => move(0),
      End: () => move(options.length - 1),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      // Four or more options wrap to two columns on phones so labels never truncate.
      className={`grid gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 ${
        options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : options.length === 3 ? "grid-cols-3" : "grid-cols-2"
      }`}
    >
      {options.map((option, i) => {
        const selected = i === index;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[i] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
            className={`min-h-11 min-w-0 rounded-xl px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] ${
              selected
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
