import {
  FOLLOWED_UPDATES_DAYS,
  FRESH_FINISH_DAYS,
  JUST_UPDATED_DAYS,
  NEW_WRITER_DAYS,
  NEW_WRITER_MAX_EPISODES,
  QUICK_READ_MAX_MINUTES,
  RATING_MIN_COUNT,
  SIMILARITY_WEIGHTS,
  WEEKEND_BINGE_MIN_EPISODES,
  type FeedRule,
} from "@/lib/feed/config";
import { FINISHED_PERCENT } from "@/lib/reading-progress-rules";
import { DAY_MS, bayesianRating, isHiddenGem, ratingAverage, trendingScore } from "@/lib/feed/scoring";
import type { TasteProfile } from "@/lib/feed/taste";
import type { PoolSeries, PoolWriter, ReaderSignals, ShelfConfig } from "@/lib/feed/types";

/*
 * What each shelf rule shows (Sweep C): a ranked list of candidates from the
 * pool of eligible series, before the composer removes repeats and caps
 * writers. Pure and client-safe. `explainShelf` says why a series is or isn't
 * on a shelf, for Administration > Feed.
 */

export type ShelfContext = {
  pool: PoolSeries[];
  writers: Map<string, PoolWriter>;
  now: number;
  signals: ReaderSignals | null;
  taste: TasteProfile;
  /** "Because you liked" anchor series id. */
  anchorId: string | null;
  /** Precomputed Trending scores (same `now`). */
  trending: Map<string, number>;
};

export function makeTrendingMap(pool: PoolSeries[], now: number) {
  return new Map(pool.map((series) => [series.id, trendingScore(series, now)]));
}

export function isNewWriter(writer: PoolWriter | undefined, now: number) {
  if (!writer) return false;
  const recent = writer.firstPublishedAt !== null && now - writer.firstPublishedAt < NEW_WRITER_DAYS * DAY_MS;
  return writer.publishedEpisodes < NEW_WRITER_MAX_EPISODES || recent;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** A shelf's genre/tag filter: any listed genre (if any) and any listed tag (if any). */
export function matchesFilter(series: PoolSeries, shelf: Pick<ShelfConfig, "genres" | "tags">) {
  const genreOk = shelf.genres.length === 0 || shelf.genres.some((genre) => genre.toLowerCase() === series.genre);
  const wanted = shelf.tags.map((tag) => tag.toLowerCase());
  const tagOk = wanted.length === 0 || series.tags.some((tag) => wanted.includes(tag.toLowerCase()));
  return genreOk && tagOk;
}

export function similarity(a: PoolSeries, b: PoolSeries) {
  const shared = a.tags.filter((tag) => b.tags.includes(tag)).length;
  return (a.genre === b.genre ? SIMILARITY_WEIGHTS.sameGenre : 0) + shared * SIMILARITY_WEIGHTS.sharedTag;
}

const byTrending = (ctx: ShelfContext) => (a: PoolSeries, b: PoolSeries) =>
  (ctx.trending.get(b.id) ?? 0) - (ctx.trending.get(a.id) ?? 0) || (b.lastPublishedAt ?? 0) - (a.lastPublishedAt ?? 0);
const byLastPublish = (a: PoolSeries, b: PoolSeries) => (b.lastPublishedAt ?? 0) - (a.lastPublishedAt ?? 0);
const within = (at: number | null, daysBack: number, now: number) => at !== null && now - at <= daysBack * DAY_MS;

/** The shelf's title and ranked candidates (empty when the rule has nothing, e.g. a personal shelf without data). */
export function shelfCandidates(shelf: ShelfConfig, ctx: ShelfContext): { title: string; items: PoolSeries[] } {
  const { pool, now } = ctx;
  const title = shelf.name;
  const trendingSort = byTrending(ctx);
  const own = (series: PoolSeries) => ctx.signals !== null && series.authorId === ctx.signals.readerId;

  switch (shelf.rule as FeedRule) {
    case "TRENDING":
      return { title, items: [...pool].sort(trendingSort) };
    case "TRENDING_GENRE":
    case "TAGS":
      return { title, items: pool.filter((series) => matchesFilter(series, shelf)).sort(trendingSort) };
    case "JUST_UPDATED":
      return { title, items: pool.filter((series) => within(series.lastPublishedAt, JUST_UPDATED_DAYS, now)).sort(byLastPublish) };
    case "TOP_RATED":
      return {
        title,
        items: pool
          .filter((series) => bayesianRating(series) !== null)
          .sort((a, b) => bayesianRating(b)! - bayesianRating(a)! || b.ratingCount - a.ratingCount),
      };
    case "COMPLETED":
      return { title, items: pool.filter((series) => series.isComplete).sort(trendingSort) };
    case "HIDDEN_GEMS":
      return { title, items: pool.filter(isHiddenGem).sort((a, b) => bayesianRating(b)! - bayesianRating(a)!) };
    case "QUICK_READS":
      return { title, items: pool.filter((series) => series.totalReadMinutes <= QUICK_READ_MAX_MINUTES).sort(trendingSort) };
    case "WEEKEND_BINGES":
      return {
        title,
        items: pool.filter((series) => series.isComplete && series.episodeCount >= WEEKEND_BINGE_MIN_EPISODES).sort(trendingSort),
      };
    case "FRESH_FINISHES":
      return {
        title,
        items: pool
          .filter((series) => series.isComplete && within(series.completedAt, FRESH_FINISH_DAYS, now))
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
      };
    case "STAFF_PICKS": {
      const byId = new Map(pool.map((series) => [series.id, series]));
      return { title, items: shelf.items.map((id) => byId.get(id)).filter((series): series is PoolSeries => Boolean(series)) };
    }
    case "NEW_WRITERS": {
      // One card per writer: their most recently updated eligible series.
      const latest = new Map<string, PoolSeries>();
      for (const series of pool) {
        if (!isNewWriter(ctx.writers.get(series.authorId), now)) continue;
        const current = latest.get(series.authorId);
        if (!current || (series.lastPublishedAt ?? 0) > (current.lastPublishedAt ?? 0)) latest.set(series.authorId, series);
      }
      const exposure = (series: PoolSeries) => ctx.writers.get(series.authorId)?.exposure7d ?? 0;
      return { title, items: [...latest.values()].sort((a, b) => exposure(a) - exposure(b) || byLastPublish(a, b)) };
    }
    case "CONTINUE_READING": {
      if (!ctx.signals) return { title, items: [] };
      const byId = new Map(pool.map((series) => [series.id, series]));
      const items = [...ctx.signals.progress]
        .filter((row) => row.percent < FINISHED_PERCENT || row.episodeNumber < row.lastEpisodeNumber)
        .sort((a, b) => b.at - a.at)
        .map((row) => byId.get(row.seriesId))
        .filter((series): series is PoolSeries => Boolean(series));
      return { title, items };
    }
    case "BECAUSE_YOU_LIKED": {
      const anchor = ctx.anchorId ? pool.find((series) => series.id === ctx.anchorId) : undefined;
      if (!anchor || !ctx.signals) return { title, items: [] };
      // Recommend only series the reader hasn't met yet.
      const known = new Set(
        [ctx.signals.follows, ctx.signals.progress, ctx.signals.ratings, ctx.signals.bookmarks].flatMap((rows) => rows.map((row) => row.seriesId)),
      );
      const items = pool
        .filter((series) => series.id !== anchor.id && !known.has(series.id) && !own(series) && similarity(anchor, series) > 0)
        .sort(
          (a, b) =>
            similarity(anchor, b) - similarity(anchor, a) ||
            (bayesianRating(b) ?? 0) - (bayesianRating(a) ?? 0) ||
            trendingSort(a, b),
        );
      return { title: `${shelf.name} ${anchor.title}`, items };
    }
    case "TRENDING_TOP_GENRE": {
      const genre = ctx.taste.topGenre;
      if (!genre) return { title, items: [] };
      return {
        title: `Trending in ${capitalize(genre)}`,
        items: pool.filter((series) => series.genre === genre && !own(series)).sort(trendingSort),
      };
    }
    case "FOLLOWED_WRITERS": {
      if (!ctx.signals || ctx.signals.followedAuthors.length === 0) return { title, items: [] };
      const followed = new Set(ctx.signals.followedAuthors);
      return {
        title,
        items: pool
          .filter((series) => followed.has(series.authorId) && within(series.lastPublishedAt, FOLLOWED_UPDATES_DAYS, now))
          .sort(byLastPublish),
      };
    }
    default:
      return { title, items: [] };
  }
}

/** Why `series` would or wouldn't be on `shelf` before the composer's repeats/cap, in plain words. */
export function explainShelf(series: PoolSeries, shelf: ShelfConfig, ctx: ShelfContext): { on: boolean; rank: number | null; reason: string } {
  if (!shelf.enabled) return { on: false, rank: null, reason: "Shelf is switched off." };
  const { items } = shelfCandidates(shelf, ctx);
  const index = items.findIndex((item) => item.id === series.id);
  if (index >= 0) {
    const rank = index + 1;
    if (rank > shelf.maxItems) return { on: false, rank, reason: `Ranked #${rank}, past the shelf's ${shelf.maxItems} items.` };
    if (items.length < shelf.minItems) return { on: false, rank, reason: `Ranked #${rank}, but the shelf has ${items.length} of the ${shelf.minItems} series it needs, so it's hidden.` };
    return { on: true, rank, reason: `On the shelf at #${rank} (before repeats and the one-per-writer cap are removed).` };
  }
  return { on: false, rank: null, reason: notOnReason(series, shelf, ctx) };
}

function notOnReason(series: PoolSeries, shelf: ShelfConfig, ctx: ShelfContext) {
  const { now } = ctx;
  switch (shelf.rule as FeedRule) {
    case "TRENDING_GENRE":
    case "TAGS":
      return "Doesn't match the shelf's genre/tags.";
    case "JUST_UPDATED":
      return `No new episode in the last ${JUST_UPDATED_DAYS} days.`;
    case "TOP_RATED":
      return `Needs at least ${RATING_MIN_COUNT} ratings (has ${series.ratingCount}).`;
    case "COMPLETED":
      return "Not marked complete.";
    case "HIDDEN_GEMS": {
      const average = ratingAverage(series);
      if (average === null) return `Needs at least ${RATING_MIN_COUNT} ratings (has ${series.ratingCount}).`;
      return `Average ${average.toFixed(2)} with ${series.readsTotal} reads: needs 4.3+ and fewer than the reads limit.`;
    }
    case "QUICK_READS":
      return `Takes ${series.totalReadMinutes} minutes; the limit is ${QUICK_READ_MAX_MINUTES}.`;
    case "WEEKEND_BINGES":
      return `Needs to be complete with ${WEEKEND_BINGE_MIN_EPISODES}+ episodes (${series.isComplete ? "complete" : "ongoing"}, ${series.episodeCount}).`;
    case "FRESH_FINISHES":
      return `Not completed in the last ${FRESH_FINISH_DAYS} days.`;
    case "STAFF_PICKS":
      return "Not picked by staff.";
    case "NEW_WRITERS": {
      if (!isNewWriter(ctx.writers.get(series.authorId), now)) {
        return `The writer isn't new: ${NEW_WRITER_MAX_EPISODES}+ episodes and first published over ${NEW_WRITER_DAYS} days ago.`;
      }
      return "Another of this writer's series is newer (one card per writer).";
    }
    default:
      return "Personal shelf: depends on each reader's history.";
  }
}
