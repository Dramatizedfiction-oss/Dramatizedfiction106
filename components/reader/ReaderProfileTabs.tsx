"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/*
 * Library / Bookmarks / Activity on the reader page. WAI-ARIA tabs with
 * automatic activation. A section's content comes from `panels` (rendered on
 * the server, e.g. the Library); sections without one show "Coming soon".
 */

type Section = {
  id: "library" | "bookmarks" | "activity";
  label: string;
  title: string;
  body: string;
  icon: ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "library",
    label: "Library",
    title: "Your library is coming soon",
    body: "Series you follow will be collected here, so you can jump back into them in one tap.",
    icon: <LibraryIcon />,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    title: "Bookmarks are coming soon",
    body: "Episodes you bookmark will be saved here for later.",
    icon: <BookmarkIcon />,
  },
  {
    id: "activity",
    label: "Activity",
    title: "Activity is coming soon",
    body: "Your comments and hearts will show up here once they arrive on Dramatized Fiction.",
    icon: <ActivityIcon />,
  },
];

export default function ReaderProfileTabs({
  panels = {},
}: {
  panels?: Partial<Record<Section["id"], ReactNode>>;
}) {
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

  const section = SECTIONS[active];

  return (
    <section aria-label="Your reading">
      <div
        role="tablist"
        aria-label="Reader sections"
        className="grid grid-cols-3 gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 sm:inline-grid sm:min-w-[420px]"
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

      {panels[section.id] ? (
        <div
          id={`${id}-panel-${section.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${section.id}`}
          tabIndex={0}
          className="mt-5 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
        >
          {panels[section.id]}
        </div>
      ) : (
        <div
          id={`${id}-panel-${section.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${section.id}`}
          tabIndex={0}
          className="theme-panel mt-5 rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] sm:px-8 sm:py-14"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
            {section.icon}
          </span>
          <p className="eyebrow mt-4">Coming soon</p>
          <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold">{section.title}</h2>
          <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">{section.body}</p>
        </div>
      )}
    </section>
  );
}

function LibraryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5M8 19V5M12 19l3.5-14 4 1-3.5 14" />
      <path d="M3 19h18" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v16l-6-4-6 4z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}
