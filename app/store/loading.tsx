// The Store while it loads: the same layout with placeholder tiles.
export default function StoreLoading() {
  return (
    <main className="px-4 py-6 md:px-6 md:py-10 lg:px-8" aria-busy="true" aria-label="Loading the Store">
      <div className="mx-auto max-w-5xl animate-pulse motion-reduce:animate-none">
        <div className="h-3 w-16 rounded bg-[var(--panel-hover)]" />
        <div className="mt-3 h-8 w-64 max-w-full rounded bg-[var(--panel-hover)]" />
        <div className="mt-6 h-11 w-28 rounded-full bg-[var(--panel-hover)]" />
        <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <li key={index} className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] p-3">
              <div className="aspect-square w-full max-w-[96px] rounded-full bg-[var(--panel-hover)]" />
              <div className="h-3 w-3/4 rounded bg-[var(--panel-hover)]" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
