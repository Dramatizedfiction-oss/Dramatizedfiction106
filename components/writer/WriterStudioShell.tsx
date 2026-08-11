"use client";

import type { AuthUser } from "@/auth";
import WriterStudioSidebar from "@/components/writer-studio/Sidebar";
import RightPanel from "@/components/writer-studio/RightPanel";
import EditorContainer from "@/components/writer-studio/EditorContainer";
import { useEffect, useState } from "react";

export default function WriterStudioShell({
  user,
  children,
  redesignEnabled = false,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
  redesignEnabled?: boolean;
}) {
  const [clientOverride, setClientOverride] = useState<boolean | null>(null);
  const [rightOpen, setRightOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("writerStudioRedesign");
      if (raw === "true") setClientOverride(true);
      else if (raw === "false") setClientOverride(false);
      else setClientOverride(null);
    } catch (e) {
      // ignore
    }
  }, []);

  const effectiveRedesign = clientOverride ?? redesignEnabled;

  if (!effectiveRedesign) {
    return (
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <WriterStudioSidebar user={user} redesignEnabled={false}>
          {children}
        </WriterStudioSidebar>
      </div>
    );
  }

  // Redesigned three-column layout: sidebar | editor-focused center | contextual right panel
  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[18px] border border-[var(--border-color)] bg-[var(--panel-bg)] shadow-xl">
      <div className="flex h-full">
        {/* Left: sidebar */}
        <div className="hidden lg:block w-[320px] flex-shrink-0">
          <WriterStudioSidebar user={user} redesignEnabled={true}>
            {null}
          </WriterStudioSidebar>
        </div>

        {/* Center: editor area */}
        <main className="min-w-0 flex-1 px-6 py-8">
          <EditorContainer>
            {/* small top bar showing story identity and quick controls */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                {/* Placeholder for story identity — existing pages can render their own if desired */}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                  onClick={() => setRightOpen((s) => !s)}
                >
                  {rightOpen ? "Close" : "Open"} Tools
                </button>
              </div>
            </div>

            {/* actual content (editor or other studio pages) */}
            <div>{children}</div>
          </EditorContainer>
        </main>

        {/* Right: contextual panel */}
        <div className={`w-[380px] border-l border-[var(--border-color)] bg-[var(--sidebar-bg)] transition-transform duration-200 ${rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:opacity-100 lg:static"}`}>
          <RightPanel open={rightOpen} onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  );
}
