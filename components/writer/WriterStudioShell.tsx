"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/auth";
import WriterStudioSidebar from "@/components/writer-studio/Sidebar";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("writerStudioRedesign");
      if (raw === "true") setClientOverride(true);
      else if (raw === "false") setClientOverride(false);
      else setClientOverride(null);
    } catch (e) {
      // ignore (SSR hydration safety)
    }
  }, []);

  const effectiveRedesign = clientOverride ?? redesignEnabled;

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <WriterStudioSidebar user={user} redesignEnabled={effectiveRedesign}>
        {children}
      </WriterStudioSidebar>
    </div>
  );
}
