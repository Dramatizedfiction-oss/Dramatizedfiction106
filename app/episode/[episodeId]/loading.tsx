// Shown while an episode loads: the reading surface with a quiet placeholder,
// so the page doesn't flash a different background before the story appears.
export default function EpisodeLoading() {
  return (
    <div className="reader-page">
      <div className="reader-column pt-24 text-center" role="status" aria-live="polite">
        <div className="mx-auto h-3 w-32 animate-pulse rounded-full bg-[var(--paper-rule)]" />
        <div className="mx-auto mt-6 h-8 w-64 max-w-full animate-pulse rounded-full bg-[var(--paper-rule)]" />
        <p className="reader-meta mt-6">Opening the story…</p>
      </div>
    </div>
  );
}
