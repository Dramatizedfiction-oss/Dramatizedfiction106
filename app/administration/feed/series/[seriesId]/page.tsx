import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SeriesModerationControl } from "@/components/admin/FeedControls";
import { Badge, Panel, Stat } from "@/components/admin/ui";
import { getScoreBreakdown } from "@/lib/feed/admin";
import { TRENDING_WEIGHTS } from "@/lib/feed/config";
import { requireAdministrationPage } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fmt = (value: number) => (Math.round(value * 100) / 100).toLocaleString();
const date = (value: Date | number | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "—");

// Administration > Feed > one series: how its Trending score is made and why it is or isn't on each shelf (Sweep C).
export default async function FeedSeriesBreakdownPage({ params }: { params: { seriesId: string } }) {
  requireAdministrationPage(await auth());
  const data = await getScoreBreakdown(params.seriesId);
  if (!data) notFound();
  const { stats, trending } = data;

  const terms = trending
    ? [
        { label: "New bookmarks", detail: `${TRENDING_WEIGHTS.newBookmarks} × √${fmt(stats?.newBookmarks7d ?? 0)}`, value: trending.newBookmarks },
        { label: "New follows", detail: `${TRENDING_WEIGHTS.newFollows} × √${fmt(stats?.newFollows7d ?? 0)}`, value: trending.newFollows },
        { label: "Completions", detail: `${TRENDING_WEIGHTS.completions} × √${fmt(stats?.completions7d ?? 0)}`, value: trending.completions },
        { label: "Reads", detail: `${TRENDING_WEIGHTS.reads} × √${fmt(stats?.reads7d ?? 0)}`, value: trending.reads },
        { label: "New ratings", detail: `${TRENDING_WEIGHTS.newRatings} × √${fmt(stats?.newRatings7d ?? 0)}`, value: trending.newRatings },
        { label: "Rating bonus", detail: data.ratingAverage === null ? "fewer than 3 ratings" : `average ${fmt(data.ratingAverage)}`, value: trending.ratingBonus },
        { label: "New-series boost", detail: `first episode ${date(stats?.firstPublishedAt)}`, value: trending.newSeriesBoost },
        { label: "Staleness", detail: `latest episode ${date(stats?.lastPublishedAt)}`, value: trending.staleness },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Link href="/administration/feed" className="theme-meta inline-flex min-h-11 items-center text-sm hover:text-[var(--accent)]">
        ← Feed
      </Link>
      <header className="space-y-2">
        <h2 className="font-heading theme-heading text-2xl font-semibold">{data.series.title}</h2>
        <p className="theme-meta text-sm">
          by {data.series.authorName ?? "Unknown"} · <Link href={`/series/${data.series.id}`} className="underline">open series</Link>
        </p>
        <div className="flex flex-wrap gap-2">
          {data.eligible ? <Badge tone="good">Eligible</Badge> : <Badge tone="danger">Not eligible</Badge>}
          <Badge tone={data.series.moderationStatus === "VISIBLE" ? "neutral" : "warn"}>{data.series.moderationStatus.replace("_", " ").toLowerCase()}</Badge>
          {data.newWriter.isNew ? <Badge tone="accent">New writer</Badge> : null}
        </div>
        {data.reasons.length ? (
          <ul className="list-disc pl-5 text-sm text-[var(--status-danger)]">
            {data.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </header>

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Trending score" value={trending ? fmt(trending.total) : "—"} note={data.trendingRank ? `#${data.trendingRank} of ${data.poolSize}` : undefined} />
        <Stat label="Ratings" value={stats ? `${stats.ratingCount}` : "—"} note={data.ratingAverage === null ? "Average hidden under 3" : `Average ${fmt(data.ratingAverage)} · adjusted ${fmt(data.bayesian ?? 0)}`} />
        <Stat label="Episodes" value={stats?.episodeCount ?? "—"} note={stats ? `${stats.totalReadMinutes} min · ${stats.isComplete ? "complete" : "ongoing"}` : undefined} />
        <Stat label="All-time" value={stats ? `${stats.readsTotal} reads` : "—"} note={stats ? `${stats.bookmarkCount} bookmarks · ${stats.followCount} follows` : undefined} />
      </section>

      {trending ? (
        <Panel title="Trending, term by term" description="Last 7 days. The series' own writer and accounts younger than 48 hours don't count.">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border-color)]">
              {terms.map((term) => (
                <tr key={term.label}>
                  <th scope="row" className="py-2 pr-3 text-left font-semibold text-[var(--text-primary)]">
                    {term.label}
                    <span className="theme-meta block text-xs font-normal">{term.detail}</span>
                  </th>
                  <td className="py-2 text-right font-mono-df text-[var(--text-primary)]">{fmt(term.value)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-2 pr-3 text-left font-semibold text-[var(--text-primary)]">Total</th>
                <td className="py-2 text-right font-mono-df font-semibold text-[var(--text-primary)]">{fmt(trending.total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="theme-meta mt-3 text-xs">Stats computed {stats ? stats.computedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "never"}.</p>
        </Panel>
      ) : null}

      <Panel
        title="New Writers"
        description={`${data.newWriter.publishedEpisodes} published episodes · first published ${date(data.newWriter.firstPublishedAt)} · shown ${data.newWriter.exposure7d} times on New Writers in the last 7 days.`}
      />

      <Panel title="Shelves" description="Before repeats across a screen and the one-card-per-writer cap, which depend on each reader's feed.">
        <ul className="divide-y divide-[var(--border-color)]">
          {data.shelves.map((shelf) => (
            <li key={shelf.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="theme-heading text-sm font-semibold">
                {shelf.name} {shelf.enabled ? null : <span className="theme-meta font-normal">(off)</span>}
              </span>
              <span className={`text-sm sm:max-w-[60%] sm:text-right ${shelf.on ? "text-[var(--status-live)]" : "theme-meta"}`}>{shelf.reason}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Moderation" description="Only visible series appear in the feed, Explore and the series page's recommendation rows. The series page itself stays reachable by link. Every change is audited.">
        <SeriesModerationControl seriesId={data.series.id} current={data.series.moderationStatus} />
      </Panel>
    </div>
  );
}
