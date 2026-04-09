export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-5xl font-bold mb-4">404</h1>
      <p className="text-slate-400 mb-6">This page doesn’t exist.</p>

      <a
        href="/"
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold"
      >
        Return Home
      </a>
    </main>
  );
}
