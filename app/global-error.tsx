"use client";

import "./globals.css";
import { useEffect } from "react";
import ErrorPage from "@/components/errors/ErrorPage";

// 500 when even the root layout fails (for example the database is down): it
// replaces the whole document, so it brings its own <html> and <body> and
// uses nothing that needs the database, a session or the app's providers.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, background: "#0e0828" }}>
        <ErrorPage code={500} onRetry={reset} fullScreen />
      </body>
    </html>
  );
}
