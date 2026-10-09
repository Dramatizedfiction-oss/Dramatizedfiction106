import Link from "next/link";
import type { LibraryEntry } from "@/lib/series-follows";
import { safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

/**
 * The Library: series the member follows, as tappable rows (cover, title,
 * author, episodes). `visitor` switches the wording for someone else's public profile.
 */
export default function ReaderLibrary({ entries, visitor = false }: { entries: LibraryEntry[]; visitor?: boolean }) {
  if (entries.length === 0) {
    return (
      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
        <p className="eyebrow">Library</p>
        <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold">Nothing here yet</h2>
        <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">
          {visitor ? (
            "This reader hasn't followed any series yet."
          ) : (
            <>
              Tap <span className="font-semibold text-[var(--text-primary)]">Follow Series</span> on any series and it will be saved here.
            </>
          )}
        </p>
        <Link href="/explore" className="story-button-primary mt-6 min-h-11">
          Explore series
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="sr-only">Library</h2>
      <p className="theme-meta text-sm">
        {entries.length} series {visitor ? "followed" : "you follow"}
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => {
          const cover = safeImageUrl(entry.coverImage);
          const accent = safeHexColor(entry.themeColor);
          return (
            <li key={entry.id}>
              <Link
                href={`/series/${entry.id}`}
                className="theme-panel-hover flex min-h-[96px] items-center gap-4 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 transition"
              >
                <span
                  className="relative h-[84px] w-[63px] shrink-0 overflow-hidden rounded-xl"
                  style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="theme-heading block truncate font-heading text-lg font-semibold">{entry.title}</span>
                  <span className="theme-meta mt-0.5 block truncate text-sm">
                    {entry.authorName ? `by ${entry.authorName}` : "Anonymous Author"}
                  </span>
                  <span className="theme-meta mt-1 block truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
                    {entry.genre} · {entry.episodeCount} {entry.episodeCount === 1 ? "episode" : "episodes"}
                  </span>
                </span>
                <span aria-hidden="true" className="shrink-0 pr-1 text-[var(--text-muted)]">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
