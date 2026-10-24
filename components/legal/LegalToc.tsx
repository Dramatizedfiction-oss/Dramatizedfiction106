"use client";

import { useEffect, useState } from "react";

export type TocSection = { id: string; number: string | null; title: string };

/*
 * The legal pages' side rail on wide screens (Sweep E): every section, with
 * the one being read marked. Sticky beside the text; phones get the
 * "Jump to section" disclosure in the article instead (LegalPage).
 */
export default function LegalTocRail({ sections }: { sections: TocSection[] }) {
  const [current, setCurrent] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = sections.map((section) => document.getElementById(section.id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      // A section counts as "being read" while it's in the upper part of the screen.
      { rootMargin: "-15% 0px -70% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Jump to section" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
      <p className="surface-group-title">Jump to section</p>
      <ol className="space-y-0.5 border-l border-[var(--border-color)]">
        {sections.map((section) => {
          const active = section.id === current;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? "location" : undefined}
                className={`-ml-px flex min-h-9 items-baseline gap-2 border-l-2 py-1.5 pl-3 text-sm leading-5 transition ${
                  active
                    ? "border-[var(--callout-rule)] font-medium text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {section.number ? <span className="surface-section-number shrink-0">{section.number}</span> : null}
                <span>{section.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
