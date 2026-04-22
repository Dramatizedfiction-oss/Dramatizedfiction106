export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="theme-heading mb-4 text-5xl font-bold">404</h1>
      <p className="theme-meta mb-6">This page does not exist.</p>

      <a href="/" className="story-button-primary">
        Return Home
      </a>
    </main>
  );
}
