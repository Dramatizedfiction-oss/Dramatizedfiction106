import Link from "next/link";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { formatRelative } from "@/lib/writer-studio/format";
import { getStudioStats } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function StudioStatsPage() {
  const user = await requireStudioUser();
  const { series, episodes, totals } = await getStudioStats(user.id);

  if (episodes.length === 0) {
    return (
      <StudioEmptyState
        title="No stats yet"
        description="Numbers appear here once you've published an episode and readers start reading."
        action={
          <Link href="/writer-studio/episodes?status=draft" className="story-button-secondary">
            Go to your drafts
          </Link>
        }
      />
    );
  }

  const tiles = [
    { label: "Total reads", value: totals.readers.toLocaleString() },
    { label: "Reads, last 7 days", value: totals.reads7.toLocaleString() },
    { label: "Reads, last 30 days", value: totals.reads30.toLocaleString() },
    { label: "Live episodes", value: totals.published.toLocaleString() },
  ];

  return (
    <div className="space-y-10">
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4">
            <p className="font-heading theme-heading text-3xl font-semibold">{tile.value}</p>
            <p className="theme-meta mt-1 text-xs uppercase tracking-[0.18em]">{tile.label}</p>
          </div>
        ))}
      </section>

      <p className="theme-meta -mt-6 text-xs leading-5">
        Reads count signed-in readers only, once per reader per episode (and at most once a day for the
        recent figures). Your own reads aren&apos;t counted.
        {totals.lastPublishedAt ? ` Last published ${formatRelative(totals.lastPublishedAt)}.` : ""}
      </p>

      <section>
        <h2 className="font-heading theme-heading mb-4 text-2xl font-semibold">Episodes</h2>
        <div className="overflow-x-auto rounded-2xl border border-[var(--studio-border)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[var(--studio-surface)] text-xs uppercase tracking-[0.14em] text-[var(--studio-muted)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-normal">Episode</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Total reads</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Last 30 days</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--studio-border)]">
              {episodes.map((episode) => (
                <tr key={episode.id}>
                  <td className="px-4 py-3">
                    <Link href={`/writer-studio/episodes/${episode.id}`} className="theme-heading font-semibold hover:underline">
                      {episode.title}
                    </Link>
                    <span className="theme-meta block text-xs">
                      {episode.series.title} · Episode {episode.episodeNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{episode.readerCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{episode.reads30.toLocaleString()}</td>
                  <td className="theme-meta px-4 py-3 text-right text-xs">
                    {episode.publishedAt ? formatRelative(episode.publishedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading theme-heading mb-4 text-2xl font-semibold">Series</h2>
        <ul className="divide-y divide-[var(--studio-border)] rounded-2xl border border-[var(--studio-border)]">
          {series.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <Link href={`/writer-studio/series/${item.id}`} className="theme-heading truncate font-semibold hover:underline">
                {item.title}
              </Link>
              <span className="shrink-0 tabular-nums text-[var(--studio-muted)]">
                {item.status === "PUBLISHED" ? `${item.reads.toLocaleString()} reads` : "Not published yet"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
