export default function ExplorePage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
            <p className="eyebrow">Trending</p>
            <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">
              Stories are loading
            </h1>
            <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
              The discovery engine is preparing the latest fiction shelves for readers.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                >
                  <div className="h-3 w-16 rounded-full bg-[var(--border-color)]" />
                  <div className="mt-4 h-5 w-3/4 rounded-full bg-[var(--border-color)]" />
                  <div className="mt-3 h-3 w-full rounded-full bg-[var(--border-color)]" />
                  <div className="mt-2 h-3 w-5/6 rounded-full bg-[var(--border-color)]" />
                </div>
              ))}
            </div>
          </section>

          <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
            <p className="eyebrow">Explore Feed</p>
            <h2 className="font-heading theme-heading mt-2 text-2xl font-semibold">
              Stories are loading
            </h2>
            <p className="theme-meta mt-3 text-sm leading-6">
              New releases, trending chapters, and featured picks will appear here once the feed is connected.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
                >
                  <div className="h-3 w-20 rounded-full bg-[var(--border-color)]" />
                  <div className="mt-4 h-6 w-4/5 rounded-full bg-[var(--border-color)]" />
                  <div className="mt-3 h-3 w-2/3 rounded-full bg-[var(--border-color)]" />
                  <div className="mt-5 space-y-2">
                    <div className="h-3 w-full rounded-full bg-[var(--border-color)]" />
                    <div className="h-3 w-5/6 rounded-full bg-[var(--border-color)]" />
                    <div className="h-3 w-2/3 rounded-full bg-[var(--border-color)]" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden xl:block">
          <div className="theme-panel sticky top-28 rounded-[24px] border border-[var(--border-color)] p-5">
            <p className="eyebrow">Status</p>
            <h2 className="theme-heading mt-2 text-xl font-semibold">Discovery feed warming up</h2>
            <p className="theme-meta mt-3 text-sm leading-6">
              Explore is intentionally clean right now while live content and ranking data are connected.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
