import { unstable_cache } from "next/cache";
import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { FEED_CACHE_TAG } from "@/lib/feed/config";
import { getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";

/*
 * The root layout's shared reads (Sweep E), cached across requests so a page
 * view doesn't pay for them each time. Errors are thrown, never cached, so a
 * database hiccup can't stick. API guards still read Renovation Mode fresh
 * (lib/auth/guards.ts); this cache only decides which screen the layout shows.
 */

export const LAYOUT_CACHE_TAG = "layout";

/** Renovation Mode as the layout sees it: at most a minute old, cleared at once when the CEO toggles it. */
export const getLayoutRenovationMode = unstable_cache(
  async () => (await getPlatformSettings()).renovationMode,
  ["layout-renovation-v1"],
  { revalidate: 60, tags: [LAYOUT_CACHE_TAG] },
);

/** The sidebar's "Trending This Week" list (3 series), refreshed every 5 minutes or with the feed. */
export const getLayoutTrending = unstable_cache(
  () =>
    prisma.series.findMany({
      where: PUBLIC_SERIES_WHERE,
      orderBy: [{ reads: "desc" }, { followers: "desc" }],
      take: 3,
      select: { id: true, title: true, genre: true, reads: true, themeColor: true },
    }),
  ["layout-trending-v1"],
  { revalidate: 300, tags: [LAYOUT_CACHE_TAG, FEED_CACHE_TAG] },
);
