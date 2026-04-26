import Link from "next/link";

type DiscoveryStory = {
  id: string;
  title: string;
  genre: string;
  reads: number;
};

export default function DiscoveryRail({
  trending,
}: {
  trending: DiscoveryStory[];
}) {
  return (
    <aside className="hidden xl:block xl:w-[280px]">
      <div className="sticky top-28">
        <div className="glass-panel rounded-[28px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Discovery</p>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
            Browse
          </h2>
          <p className="theme-meta mt-2 text-sm">
            One slim rail for navigation and trending stories.
          </p>

          <nav className="mt-5 space-y-3">
            <Link
              href="/explore"
              className="theme-panel-hover block rounded-[20px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)]"
            >
              <span className="theme-heading block font-medium">Explore</span>
              <span className="theme-meta mt-1 block text-xs">
                The main browsing feed.
              </span>
            </Link>

            <Link
              href="/explore?view=for-you"
              className="theme-panel-hover block rounded-[20px] border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--text-primary)]"
            >
              <span className="theme-heading block font-medium">For You</span>
              <span className="theme-meta mt-1 block text-xs">
                Placeholder for personalized recommendations.
              </span>
            </Link>

            <details className="theme-panel rounded-[20px] border border-[var(--border-color)] px-4 py-3" open>
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-[var(--text-primary)]">
                <span className="font-medium">Trending (Top 3)</span>
                <span className="theme-meta text-xs uppercase tracking-[0.2em]">
                  Open
                </span>
              </summary>

              <div className="mt-3 space-y-2">
                {trending.length > 0 ? (
                  trending.map((story, index) => (
                    <Link
                      key={story.id}
                      href={`/series/${story.id}`}
                      className="theme-panel-hover block rounded-[18px] border border-transparent px-3 py-3"
                    >
                      <p className="theme-meta font-mono-df text-[10px] uppercase tracking-[0.26em]">
                        {String(index + 1).padStart(2, "0")} | {story.reads} reads
                      </p>
                      <p className="theme-heading mt-2 text-sm font-medium">
                        {story.title}
                      </p>
                      <p className="theme-meta mt-1 text-xs">{story.genre}</p>
                    </Link>
                  ))
                ) : (
                  <p className="theme-meta rounded-[18px] border border-dashed border-[var(--border-color)] px-3 py-4 text-sm">
                    Trending stories will appear here when data is available.
                  </p>
                )}
              </div>
            </details>
          </nav>
        </div>
      </div>
    </aside>
  );
}
