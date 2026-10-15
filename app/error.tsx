"use client";

import { useEffect } from "react";
import ErrorPage from "@/components/errors/ErrorPage";

// 500 inside the site layout. The error's own message is never shown to readers
// (it can contain internals); it goes to the console, with Next's digest.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorPage code={500} onRetry={reset} />;
}
