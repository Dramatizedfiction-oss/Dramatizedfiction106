"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="theme-heading text-3xl font-bold mb-4">Something went wrong</h1>

      <p className="theme-meta mb-6">{error.message}</p>

      <button
        onClick={reset}
        className="story-button-primary"
      >
        Try Again
      </button>
    </main>
  );
}
