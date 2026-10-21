import Link from "next/link";
import { auth } from "@/auth";
import FeedShelfManager from "@/components/admin/FeedShelfManager";
import { RefreshFeedButton, SeriesLookup } from "@/components/admin/FeedControls";
import { Panel, Stat } from "@/components/admin/ui";
import { listShelves } from "@/lib/feed/admin";
import { FEED_CACHE_SECONDS, STATS_MAX_AGE_MINUTES } from "@/lib/feed/config";
import { prisma } from "@/lib/prisma";
import { requireAdministrationPage } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Administration > Feed (Sweep C): shelves, stats freshness, score lookup, signals.
export default async function AdministrationFeedPage() {
  requireAdministrationPage(await auth());

  const [shelves, stats, held] = await Promise.all([
    listShelves(),
    prisma.seriesStats.aggregate({ _count: { _all: true }, _min: { computedAt: true } }),
    prisma.series.count({ where: { moderationStatus: { not: "VISIBLE" } } }),
  ]);
  const oldest = stats._min.computedAt;

  return (
    <div className="space-y-6">
      <section aria-label="Feed at a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Shelves on" value={`${shelves.filter((shelf) => shelf.enabled).length}/${shelves.length}`} />
        <Stat label="Series with stats" value={stats._count._all.toLocaleString()} />
        <Stat label="Not visible" value={held.toLocaleString()} note="Held, in review or blocked" />
        <Stat label="Stats from" value={oldest ? oldest.toISOString().slice(11, 16) + " UTC" : "—"} note={oldest ? oldest.toISOString().slice(0, 10) : "Not computed yet"} />
      </section>

      <Panel
        title="How fresh it is"
        description={`Stats refresh for a series when it publishes, for everything when the feed finds them over ${STATS_MAX_AGE_MINUTES} minutes old, and daily by the scheduled job. Readers' feeds are cached for ${FEED_CACHE_SECONDS / 60} minutes.`}
        action={
          <Link href="/administration/feed/signals" className="story-button-secondary min-h-11">
            Signals
          </Link>
        }
      >
        <RefreshFeedButton />
      </Panel>

      <Panel title="Why is a series (not) on a shelf?" description="Find a series to see its Trending score term by term, its eligibility and every shelf it is or isn't on. Hold or release it there.">
        <SeriesLookup />
      </Panel>

      <FeedShelfManager
        shelves={shelves.map((shelf) => ({
          id: shelf.id,
          key: shelf.key,
          name: shelf.name,
          tier: shelf.tier,
          rule: shelf.rule,
          genres: shelf.genres,
          tags: shelf.tags,
          weight: shelf.weight,
          minItems: shelf.minItems,
          maxItems: shelf.maxItems,
          enabled: shelf.enabled,
          builtIn: shelf.builtIn,
          months: shelf.months,
          picks: shelf.items.map((item) => ({
            id: item.seriesId,
            title: item.series.title,
            authorName: item.series.author.name,
            published: item.series.status === "PUBLISHED",
          })),
        }))}
      />
    </div>
  );
}
