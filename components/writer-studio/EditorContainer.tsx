"use client";

import React from "react";

export default function EditorContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 lg:px-8">
      <div className="rounded-lg bg-[var(--editor-bg)]/0 px-4 py-6">
        <div className="prose prose-invert mx-auto max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}
