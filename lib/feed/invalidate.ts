import { revalidateTag } from "next/cache";
import { FEED_CACHE_TAG } from "@/lib/feed/config";
import { refreshSeriesStats } from "@/lib/feed/stats";

/*
 * Keeping the feed current (Sweep C). Server-only. Both are best effort: a
 * failure is logged and never fails the writer's or admin's request (the
 * hourly lazy refresh and the daily cron catch up).
 */

/** Clears the cached feed pool, so the next view rebuilds it. */
export function invalidateFeed() {
  try {
    revalidateTag(FEED_CACHE_TAG);
  } catch (error) {
    // Outside a Next request (scripts, tests) there is no cache to clear.
    if (!String(error).includes("static generation store missing")) console.error("Feed cache invalidation failed.", error);
  }
}

/** After a publish or a change to a series' details: refresh its stats, then clear the cache. */
export async function refreshSeriesInFeed(seriesId: string) {
  try {
    await refreshSeriesStats(seriesId);
  } catch (error) {
    console.error("Feed stats refresh for one series failed.", error);
  }
  invalidateFeed();
}
