"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/*
 * Library / Activity on the member's own reading profile. WAI-ARIA tabs with
 * automatic activation. The Library tab holds three stacked sections
 * (Followed Series, Bookmarks, Follows: components/reader/LibraryShelves); both panels are
 * rendered on the server and passed in, and stay mounted while hidden.
 */

type SectionId = "library" | "activity";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "activity", label: "Activity" },
];

export default function ReaderProfileTabs({ panels }: { panels: Record<SectionId, ReactNode> }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusTab(index: number) {
    const next = (index + SECTIONS.length) % SECTIONS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusTab(active + 1),
      ArrowLeft: () => focusTab(active - 1),
      Home: () => focusTab(0),
      End: () => focusTab(SECTIONS.length - 1),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  return (
    <section aria-label="Your reading">
      <div
        role="tablist"
        aria-label="Reader sections"
        className="grid grid-cols-2 gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 sm:inline-grid sm:min-w-[300px]"
      >
        {SECTIONS.map((item, index) => {
          const selected = index === active;
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
              onClick={() => setActive(index)}
              onKeyDown={handleKeyDown}
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

      {SECTIONS.map((item, index) => (
        <div
          key={item.id}
          id={`${id}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${item.id}`}
          hidden={index !== active}
          tabIndex={0}
          className="mt-5 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
        >
          {panels[item.id]}
        </div>
      ))}
    </section>
  );
}
