import {
  COLD_START_RULES,
  FEED_MAX_SHELVES,
  LEADING_RULES,
  MATURE_FEED_CAP,
  MAX_PER_AUTHOR_PER_SHELF,
  NEW_WRITERS_MAX_POSITION,
  NEW_WRITERS_SHOW_RATE,
  type FeedRule,
} from "@/lib/feed/config";
import { shelfCandidates, type ShelfContext } from "@/lib/feed/shelves";
import type { ComposedShelf, PoolSeries, ShelfConfig } from "@/lib/feed/types";

/*
 * The feed composer (Sweep C). Pure and client-safe.
 *   1. Seed: reader + UTC day, so a feed is stable all day (refreshes don't
 *      shuffle it) and changes tomorrow.
 *   2. Leading personal shelves (Continue Reading, Because you liked) first,
 *      when they have something.
 *   3. New Writers on NEW_WRITERS_SHOW_RATE of days (always in a cold feed),
 *      placed within the first NEW_WRITERS_MAX_POSITION shelves.
 *   4. The rest by weighted random order (each shelf's `weight`).
 *   5. Filling: no series on two shelves (nor in `alreadyShown`, when given;
 *      since Sweep D Explore doesn't pass its top row, so shelves may repeat
 *      it), at most MAX_PER_AUTHOR_PER_SHELF cards per writer
 *      per shelf, cut at maxItems; a shelf left under minItems is skipped.
 *      Leading personal shelves and New Writers are filled first (they keep
 *      their series), the rest in display order.
 * The whole feed is composed every time and paged by slicing, so "More
 * shelves" never repeats what the first load showed.
 */

/** 32-bit string hash (xmur3-style). */
export function hashSeed(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Deterministic random numbers in [0, 1) (mulberry32). */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function utcDay(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

/** Same seed for a reader all day; signed-out visitors share one feed per day. */
export function feedSeed(readerId: string | null, now: number) {
  return `${readerId ?? "anon"}:${utcDay(now)}`;
}

export function inSeason(shelf: Pick<ShelfConfig, "months">, now: number) {
  return shelf.months.length === 0 || shelf.months.includes(new Date(now).getUTCMonth() + 1);
}

export type ComposeInput = {
  shelves: ShelfConfig[];
  ctx: ShelfContext;
  seed: string;
  /** Series already on screen above the feed (Explore's top row). */
  alreadyShown?: Iterable<string>;
  /** Rules not to use here (Explore's top row already is Trending). */
  skipRules?: Iterable<FeedRule>;
  /** Fill only the priority shelves (leading personal + New Writers), to reserve their series. */
  priorityOnly?: boolean;
};

/** Shelves that are filled first and keep their series: Continue Reading, Because you liked, New Writers. */
export function isPriorityShelf(shelf: Pick<ShelfConfig, "rule">) {
  return LEADING_RULES.includes(shelf.rule) || shelf.rule === "NEW_WRITERS";
}

/** The order shelves are tried in. Exposed for tests and the admin preview. */
export function orderShelves(input: Pick<ComposeInput, "shelves" | "seed" | "skipRules"> & { hasTaste: boolean }): ShelfConfig[] {
  const random = seededRandom(hashSeed(input.seed));
  const skip = new Set(input.skipRules ?? []);
  const active = input.shelves.filter((shelf) => shelf.enabled && !skip.has(shelf.rule));
  const leading = LEADING_RULES.flatMap((rule) => active.filter((shelf) => shelf.rule === rule));
  const newWriters = active.find((shelf) => shelf.rule === "NEW_WRITERS");
  // Draw New Writers first so the rest of the order doesn't change its odds.
  const showNewWriters = Boolean(newWriters) && (!input.hasTaste || random() < NEW_WRITERS_SHOW_RATE);
  const coldForced = input.hasTaste ? [] : active.filter((shelf) => COLD_START_RULES.includes(shelf.rule) && shelf.rule !== "NEW_WRITERS");

  const rest = active.filter((shelf) => !leading.includes(shelf) && shelf !== newWriters && !coldForced.includes(shelf));
  // Weighted order without replacement (Efraimidis-Spirakis): key = u^(1/w), largest first.
  const keyed = rest
    .filter((shelf) => shelf.weight > 0)
    .map((shelf) => ({ shelf, key: Math.pow(random(), 1 / shelf.weight) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.shelf);

  const order = [...leading, ...coldForced, ...keyed];
  if (showNewWriters && newWriters) {
    const from = Math.min(leading.length, NEW_WRITERS_MAX_POSITION - 1);
    const position = from + Math.floor(random() * (NEW_WRITERS_MAX_POSITION - from));
    order.splice(Math.min(position, order.length), 0, newWriters);
  }
  return order;
}

export function composeFeed(input: ComposeInput & { now: number }): ComposedShelf[] {
  const shelves = input.shelves.filter((shelf) => inSeason(shelf, input.now));
  const order = orderShelves({ shelves, seed: input.seed, skipRules: input.skipRules, hasTaste: input.ctx.taste.hasTaste });
  const used = new Set(input.alreadyShown ?? []);
  let shownCards = used.size;
  let matureCards = 0;
  const filled = new Map<ShelfConfig, ComposedShelf>();

  // Fill the leading personal shelves and New Writers first so they keep their
  // series (a broad shelf drawn above them can't empty them); show in `order`.
  const priority = (shelf: ShelfConfig) => (LEADING_RULES.includes(shelf.rule) ? 0 : shelf.rule === "NEW_WRITERS" ? 1 : 2);
  const fillOrder = [...order].sort((a, b) => priority(a) - priority(b));

  for (const shelf of fillOrder) {
    if (filled.size >= FEED_MAX_SHELVES) break;
    if (input.priorityOnly && !isPriorityShelf(shelf)) continue;
    const { title, items } = shelfCandidates(shelf, input.ctx);
    const perAuthor = new Map<string, number>();
    const picked: PoolSeries[] = [];
    for (const series of items) {
      if (picked.length >= shelf.maxItems) break;
      if (used.has(series.id)) continue;
      if ((perAuthor.get(series.authorId) ?? 0) >= MAX_PER_AUTHOR_PER_SHELF) continue;
      // CONTENT RATING HOOK: keep mature cards under MATURE_FEED_CAP of the screen (none exist in Phase 1).
      if (series.isMature && (matureCards + 1) / (shownCards + picked.length + 1) > MATURE_FEED_CAP) continue;
      perAuthor.set(series.authorId, (perAuthor.get(series.authorId) ?? 0) + 1);
      picked.push(series);
    }
    if (picked.length < shelf.minItems) continue;
    for (const series of picked) {
      used.add(series.id);
      if (series.isMature) matureCards += 1;
    }
    shownCards += picked.length;
    filled.set(shelf, {
      key: shelf.key,
      rule: shelf.rule,
      title,
      cards: picked.map((series) => ({
        id: series.id,
        title: series.title,
        coverImage: series.coverImage,
        genre: series.genre,
        themeColor: series.themeColor,
        authorName: series.authorName,
      })),
    });
  }
  return order.flatMap((shelf) => (filled.has(shelf) ? [filled.get(shelf)!] : []));
}
