import { rankExplore, type ExploreSort } from "@/lib/explore-ranking";
import { getFeedPool } from "@/lib/feed/server";
import type { FeedPool } from "@/lib/feed/types";

/*
 * Explore's data (Sweep B1; from the feed's cached pool since Sweep C): every
 * eligible series (lib/feed/eligibility.ts) with what the cards show, and both
 * orders. Server-only. No query on a cache hit.
 */

export async function getExploreCatalogue(pool?: FeedPool) {
  const source = pool ?? (await getFeedPool());
  const series = source.series.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    coverImage: item.coverImage,
    genre: item.genre,
    themeColor: item.themeColor,
    authorName: item.authorName,
    reads: item.readsTotal,
    createdAt: new Date(item.createdAt),
  }));
  const orders: Record<ExploreSort, string[]> = rankExplore(source.series);
  return { series, orders };
}
