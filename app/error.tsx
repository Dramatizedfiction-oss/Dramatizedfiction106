"use client";

export default function GlobalError({ error, reset }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
      <p className="text-slate-400 mb-6">{error.message}</p>

      <button
        onClick={() => reset()}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold"
      >
        Try Again
      </button>
    </main>
  );
}
