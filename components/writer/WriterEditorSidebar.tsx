"use client";

import { useState } from "react";
import type { WriterCharacterPreview } from "@/lib/writer-studio";

export default function WriterEditorSidebar({
  characters,
}: {
  characters: WriterCharacterPreview[];
}) {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col gap-5">
      <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
        <p className="eyebrow">Fonts</p>
        <select className="theme-panel mt-3 w-full rounded-[16px] border border-[var(--border-color)] px-3 py-3 text-sm text-[var(--text-primary)]">
          <option>Editorial Serif</option>
          <option>Studio Sans</option>
          <option>Cinematic Mono</option>
        </select>
      </div>

      <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
        <p className="eyebrow">Text Color</p>
        <div className="mt-3 flex gap-3">
          {["#f5f5f5", "#d9c2a3", "#8ad5ff", "#f59e9e"].map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Color ${color}`}
              className="h-10 w-10 rounded-full border border-[var(--border-color)]"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
        <p className="eyebrow">Scene Dividers</p>
        <div className="mt-3 grid gap-2">
          {["Fade Break", "Signal Cut", "Chapter Pulse"].map((item) => (
            <button
              key={item}
              type="button"
              className="theme-panel-hover rounded-[16px] border border-[var(--border-color)] px-3 py-3 text-left text-sm text-[var(--text-primary)]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Character Database</p>
            <p className="theme-meta mt-2 text-xs">
              Placeholder structure for future series-linked character records.
            </p>
          </div>
          <button
            type="button"
            className="story-button-secondary text-xs"
          >
            Add Character
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {characters.map((character) => (
            <div
              key={character.id}
              className="rounded-[18px] border border-[var(--border-color)] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="theme-heading text-sm font-semibold">{character.name}</p>
                <span className="theme-meta rounded-full border border-[var(--border-color)] px-2 py-1 text-[10px] uppercase tracking-[0.24em]">
                  {character.type}
                </span>
              </div>
              <p className="theme-meta mt-2 text-xs leading-5">{character.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="story-button-secondary"
        >
          Tools
        </button>
      </div>

      <aside className="hidden w-[320px] shrink-0 lg:block">{sidebarContent}</aside>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close tools"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-[28px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-2xl lg:hidden">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Editor Tools</p>
                <p className="theme-meta mt-1 text-sm">Mobile tool sheet</p>
              </div>
              <button
                type="button"
                className="story-button-secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
