"use client";

import { useRef } from "react";

/*
 * A Content Markdown textarea with a small toolbar (bold, italic, link,
 * heading, lists, table). The buttons only insert Markdown characters; the
 * text is still plain text, rendered safely by lib/content/markdown.ts.
 */
type Edit = { value: string; start: number; end: number };

function wrap(value: string, start: number, end: number, before: string, after: string, placeholder: string): Edit {
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return { value: next, start: start + before.length, end: start + before.length + selected.length };
}

function prefixLines(value: string, start: number, end: number, prefix: (index: number) => string): Edit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const changed = lines.map((line, index) => prefix(index) + line.replace(/^(#{2,3}\s|-\s|\d+\.\s)/, "")).join("\n");
  const next = value.slice(0, lineStart) + changed + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + changed.length };
}

function insertBlock(value: string, start: number, block: string): Edit {
  const before = value.slice(0, start);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const next = before + lead + block + "\n\n" + value.slice(start);
  const at = before.length + lead.length;
  return { value: next, start: at, end: at + block.length };
}

const TOOLS: { label: string; title: string; run: (value: string, start: number, end: number) => Edit }[] = [
  { label: "B", title: "Bold", run: (v, s, e) => wrap(v, s, e, "**", "**", "bold text") },
  { label: "I", title: "Italic", run: (v, s, e) => wrap(v, s, e, "*", "*", "italic text") },
  { label: "Link", title: "Link", run: (v, s, e) => wrap(v, s, e, "[", "](https://)", "link text") },
  { label: "H", title: "Heading", run: (v, s, e) => prefixLines(v, s, e, () => "## ") },
  { label: "• List", title: "Bulleted list", run: (v, s, e) => prefixLines(v, s, e, () => "- ") },
  { label: "1. List", title: "Numbered list", run: (v, s, e) => prefixLines(v, s, e, (index) => `${index + 1}. `) },
  { label: "Table", title: "Table", run: (v, s) => insertBlock(v, s, "| Column | Column |\n|---|---|\n| Text | Text |") },
];

export default function MarkdownField({
  id,
  value,
  onChange,
  max,
  rows,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  rows: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(tool: (typeof TOOLS)[number]) {
    const element = ref.current;
    if (!element) return;
    const edit = tool.run(element.value, element.selectionStart, element.selectionEnd);
    onChange(edit.value);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(edit.start, edit.end);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] focus-within:border-[var(--border-strong)]">
      <div role="toolbar" aria-label="Formatting" aria-controls={id} className="flex gap-1 overflow-x-auto border-b border-[var(--border-color)] bg-[var(--bg-primary)] p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onClick={() => apply(tool)}
            className={`min-h-11 min-w-11 shrink-0 rounded-xl px-3 text-sm text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)] ${
              tool.label === "B" ? "font-bold" : tool.label === "I" ? "italic" : "font-medium"
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={max}
        spellCheck
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="block w-full resize-y bg-[var(--bg-secondary)] px-4 py-3 text-base leading-7 text-[var(--text-primary)] outline-none sm:text-sm"
      />
    </div>
  );
}
